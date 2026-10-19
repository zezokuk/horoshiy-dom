import type { Payload } from 'payload'

/**
 * Leads → amoCRM (the client's sales team works there, the meeting 14.10: «это АМА-СРМ»).
 * A lead is created with its contact in one call (POST /api/v4/leads/complex), the details go into a note.
 *
 * Settings in .env (from the client's amoCRM: Настройки → Интеграции → «Создать интеграцию» → долгосрочный токен):
 *   AMO_DOMAIN=horoshiydom.amocrm.ru   AMO_TOKEN=…   AMO_PIPELINE_ID= AMO_STATUS_ID= (optional: the funnel and its first stage)
 * Without them the integration is off: leads stay in the admin and Telegram, nothing is lost.
 * If amoCRM does not answer, the lead waits in a queue (status «в очереди») and is sent again: after the next lead
 * and every 5 minutes (instrumentation.ts), up to MAX_TRIES times.
 */
export const MAX_TRIES = 10

type AmoLead = { title: string; name: string; phone: string; tags: string[]; note: string }

const base = () => process.env.AMO_API || (process.env.AMO_DOMAIN ? `https://${process.env.AMO_DOMAIN}` : '') // AMO_API: tests
export const amoOn = () => Boolean(base() && process.env.AMO_TOKEN)

async function call(path: string, body: unknown) {
  const r = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AMO_TOKEN}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) throw new Error(`amoCRM ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`)
  return r.json()
}

/** Creates the deal with its contact and a note. Returns the deal id. */
export async function sendToAmo(lead: AmoLead): Promise<number> {
  const pipeline = Number(process.env.AMO_PIPELINE_ID) || undefined
  const status = Number(process.env.AMO_STATUS_ID) || undefined
  const res = (await call('/api/v4/leads/complex', [
    {
      name: lead.title,
      ...(pipeline ? { pipeline_id: pipeline } : {}),
      ...(status ? { status_id: status } : {}),
      _embedded: {
        tags: lead.tags.map((name) => ({ name })),
        contacts: [
          {
            first_name: lead.name,
            custom_fields_values: [{ field_code: 'PHONE', values: [{ value: lead.phone, enum_code: 'MOB' }] }],
          },
        ],
      },
    },
  ])) as { id: number }[]
  const id = res?.[0]?.id
  if (!id) throw new Error('amoCRM: no deal id in the answer')
  // the note is a nicety: the deal already exists, so a failed note does not send the lead again
  await call('/api/v4/leads/notes', [{ entity_id: id, note_type: 'common', params: { text: lead.note } }]).catch(() => null)
  return id
}

type LeadDoc = {
  id: number
  name: string
  phone: string
  source?: string | null
  context?: string | null
  page?: string | null
  interest?: string | null
  crmTries?: number | null
  house?: unknown
  estate?: unknown
  region?: unknown
}

const title = (o: unknown) => (o && typeof o === 'object' ? ((o as { name?: string; title?: string; code?: string }).name ?? '') : '')

/** What the deal looks like in amoCRM: «Сайт: Динская, Тип 5 — Иван», tags = source and estate, the rest in the note. */
export function amoLeadFrom(doc: LeadDoc): AmoLead {
  const house = doc.house && typeof doc.house === 'object' ? (doc.house as { title?: string; code?: string }) : null
  const estate = title(doc.estate)
  const where = [estate, house?.title].filter(Boolean).join(', ')
  return {
    title: `Сайт: ${where || doc.context || 'заявка'} — ${doc.name}`,
    name: doc.name,
    phone: doc.phone,
    tags: ['сайт', doc.source, estate].filter((t): t is string => Boolean(t)).map((t) => t.slice(0, 50)),
    note: [
      `Заявка с сайта №${doc.id}`,
      house && `Дом: ${house.title} (${house.code})`,
      estate && `Посёлок: ${estate}`,
      title(doc.region) && `Регион: ${title(doc.region)}`,
      doc.interest && `Интерес: ${doc.interest}`,
      doc.context && `Что смотрел: ${doc.context}`,
      doc.source && `Источник: ${doc.source}`,
      doc.page && `Страница: ${doc.page}`,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

/** Send one lead; the result is written into the lead (crm status, deal id, tries, error). */
export async function deliverToAmo(payload: Payload, id: number) {
  if (!amoOn()) {
    await payload.update({ collection: 'leads', id, overrideAccess: true, data: { crm: 'off' } })
    return 'off' as const
  }
  const doc = (await payload.findByID({ collection: 'leads', id, depth: 1, overrideAccess: true })) as unknown as LeadDoc
  const tries = (doc.crmTries ?? 0) + 1
  try {
    const dealId = await sendToAmo(amoLeadFrom(doc))
    await payload.update({ collection: 'leads', id, overrideAccess: true, data: { crm: 'sent', crmId: String(dealId), crmTries: tries, crmError: '' } })
    return 'sent' as const
  } catch (e) {
    const failed = tries >= MAX_TRIES
    await payload.update({
      collection: 'leads',
      id,
      overrideAccess: true,
      data: { crm: failed ? 'error' : 'queued', crmTries: tries, crmError: (e as Error).message.slice(0, 300) },
    })
    return failed ? ('error' as const) : ('queued' as const)
  }
}

let running = false
/** Re-send every queued lead (oldest first). One pass at a time. */
export async function retryQueued(payload: Payload) {
  if (!amoOn() || running) return 0
  running = true
  try {
    const { docs } = await payload.find({ collection: 'leads', where: { crm: { equals: 'queued' } }, sort: 'createdAt', limit: 50, depth: 0, overrideAccess: true })
    let sent = 0
    for (const d of docs) if ((await deliverToAmo(payload, d.id as number)) === 'sent') sent++
    return sent
  } finally {
    running = false
  }
}
