import { after } from 'next/server'
import type { Endpoint, PayloadRequest } from 'payload'
import { AD_PARAM, leadSource } from '../lib/leadSource'
import { MAIN_URL, ROOT_DOMAIN } from '../lib/site'
import { deliverToAmo, retryQueued } from './amocrm'

/**
 * POST /api/leads/submit — every form on every (sub)domain posts here.
 * Same rules as the demo's lead.php, tested there: honeypot, phone check, consent, rate limit per IP.
 * The lead is SAVED FIRST (admin → «Заявки»), then the manager of its region is notified in Telegram, then it goes
 * to amoCRM (collections/amocrm.ts — with a retry queue).
 * Bot token: TELEGRAM_BOT_TOKEN in .env; chat ids: region «Telegram для заявок» or, if empty, the company setting.
 */
const INTEREST = { buy: 'купить готовый дом', build: 'построить дом', future: 'присматривается, на будущее', mortgage: 'ипотека' } as const
const hits = new Map<string, number[]>() // ip → timestamps; in memory is enough for one server
const LIMIT = 5
const WINDOW = 10 * 60 * 1000

const clean = (v: unknown, max: number) =>
  typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max) : ''
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// the same machine (tests, a manager on the server itself) is not a bot. Behind a proxy the visitor's own IP comes in
// x-forwarded-for, so this never exempts internet traffic; without that header there is no IP to limit anyway
const LOOPBACK = /^(127\.\d+\.\d+\.\d+|::1|::ffff:127\.\d+\.\d+\.\d+)$/

function rateOk(ip: string) {
  if (!ip || LOOPBACK.test(ip)) return true
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => t > now - WINDOW)
  if (list.length >= LIMIT) return false
  list.push(now)
  hits.set(ip, list)
  return true
}

async function telegram(chats: string[], text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chats.length) return 'off'
  const api = process.env.TELEGRAM_API || 'https://api.telegram.org' // overridable for tests
  let sent = 0
  let err = ''
  for (const chat_id of chats) {
    try {
      const r = await fetch(`${api}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) sent++
      else err = `telegram ${r.status}`
    } catch (e) {
      err = `telegram ${(e as Error).message}`
    }
  }
  return sent ? 'ok' : err || 'telegram error'
}

export const leadEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const json = (await req.json?.().catch(() => null)) as Record<string, unknown> | null
    if (!json || typeof json !== 'object') return Response.json({ ok: false, error: 'bad_json' }, { status: 400 })

    // bots fill the hidden field; answer «ok» so they do not retry, but save nothing
    if (clean(json.website, 100)) return Response.json({ ok: true })

    const name = clean(json.name, 80)
    let digits = clean(json.phone, 40).replace(/\D/g, '')
    if (digits.length === 10) digits = '7' + digits
    if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1)
    if (!name || !/^7\d{10}$/.test(digits)) return Response.json({ ok: false, error: 'invalid' }, { status: 422 })
    if (!json.consent) return Response.json({ ok: false, error: 'no_consent' }, { status: 422 })
    const phone = `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
    if (!rateOk(ip)) return Response.json({ ok: false, error: 'too_many' }, { status: 429 })

    const utm: Record<string, string> = {}
    if (json.utm && typeof json.utm === 'object') {
      for (const [k, v] of Object.entries(json.utm as Record<string, unknown>)) {
        if (AD_PARAM.test(k)) utm[k] = clean(v, 150)
      }
    }
    const regionSlug = clean(json.region, 40)
    const { docs } = regionSlug
      ? await req.payload.find({ collection: 'regions', where: { slug: { equals: regionSlug } }, limit: 1, depth: 0, overrideAccess: true })
      : { docs: [] }
    const region = docs[0]
    const context = clean(json.context, 200)
    const interestRaw = clean(json.interest, 20)
    const interest = (['buy', 'build', 'future', 'mortgage'] as const).find((v) => v === interestRaw)
    const page = clean(json.page, 300)
    const ref = clean(json.ref, 300)
    const landingPage = clean(json.landing, 300) // the first page of the visit (not a promo page)
    const source = leadSource(utm, ref, ROOT_DOMAIN)

    // the lead links to the house / estate it was sent from (the manager sees exactly which house): a form may name them,
    // otherwise they come from the page address — so the shared form at the bottom of every page knows them too
    const path = (() => {
      try {
        return new URL(page).pathname
      } catch {
        return ''
      }
    })()
    const houseCode = clean(json.house, 60) || (path.match(/\/houses\/([\w-]+)\/?$/)?.[1] ?? '')
    // a promo page (/p/<slug>): the lead carries its estate and «Промо «…»», whichever form on the page was used
    const landingSlug = path.match(/\/p\/([\w-]+)\/?$/)?.[1] ?? ''
    const landing = landingSlug
      ? (await req.payload.find({ collection: 'landings', where: { slug: { equals: landingSlug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
      : undefined
    const landingEstate = landing?.estate ? (typeof landing.estate === 'object' ? landing.estate.slug : undefined) : undefined
    const estateSlug =
      clean(json.estate, 60) ||
      (path.match(/\/objects\/([\w-]+)\/?$/)?.[1] ?? '') ||
      landingEstate ||
      (landing?.estate && typeof landing.estate === 'number'
        ? (await req.payload.findByID({ collection: 'estates', id: landing.estate, depth: 0, overrideAccess: true })).slug
        : '')
    const [house, estateDoc] = await Promise.all([
      houseCode
        ? req.payload.find({ collection: 'houses', where: { code: { equals: houseCode } }, limit: 1, depth: 0, overrideAccess: true }).then((r) => r.docs[0])
        : undefined,
      estateSlug
        ? req.payload.find({ collection: 'estates', where: { slug: { equals: estateSlug } }, limit: 1, depth: 0, overrideAccess: true }).then((r) => r.docs[0])
        : undefined,
    ])
    const leadContext = context || (landing ? `Промо «${landing.title}»` : '')
    const estateId = estateDoc?.id ?? (house ? (typeof house.estate === 'object' ? house.estate.id : house.estate) : undefined)
    const estateName = estateDoc?.name ?? (estateId ? (await req.payload.findByID({ collection: 'estates', id: estateId, depth: 0, overrideAccess: true })).name : '')

    const lead = await req.payload.create({
      collection: 'leads',
      overrideAccess: true,
      data: {
        name,
        phone,
        region: region?.id,
        interest,
        house: house?.id,
        estate: estateId,
        source,
        context: leadContext,
        page,
        landing: landingPage,
        ref,
        utm,
        status: 'new',
      },
    })

    const company = await req.payload.findGlobal({ slug: 'company', depth: 0, overrideAccess: true })
    const chats = (region?.leadChatIds?.length ? region.leadChatIds : company.leadChatIds) || []
    const utmText = Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(' ')
    // Telegram is a foreign service: sending a name and a phone there may count as cross-border transfer (152-ФЗ).
    // TELEGRAM_PERSONAL_DATA=0 sends the lead without them, with a link to the admin — the client's lawyer decides
    const withContacts = process.env.TELEGRAM_PERSONAL_DATA !== '0'
    const lines = [
      `🏠 <b>Новая заявка с сайта</b> №${lead.id}`,
      '',
      withContacts ? `<b>Имя:</b> ${esc(name)}` : `<b>Открыть:</b> ${MAIN_URL}/admin/collections/leads/${lead.id}`,
      withContacts && `<b>Телефон:</b> ${esc(phone)}`,
      region && `<b>Регион:</b> ${esc(region.name)}`,
      interest && `<b>Хочет:</b> ${INTEREST[interest]}`,
      house && `<b>Дом:</b> ${esc(`${house.title}, ${house.code}`)}`,
      estateName && `<b>Посёлок:</b> ${esc(estateName)}`,
      leadContext && `<b>Интерес:</b> ${esc(leadContext)}`,
      `<b>Источник:</b> ${esc(source)}`,
      page && `<b>Страница:</b> ${esc(page)}`,
      utmText && `<b>Реклама:</b> ${esc(utmText)}`,
      ref && `<b>Пришёл с:</b> ${esc(ref)}`,
    ].filter(Boolean)
    const delivery = await telegram(chats as string[], lines.join('\n'))
    await req.payload.update({ collection: 'leads', id: lead.id, overrideAccess: true, data: { delivery } })

    // amoCRM after the answer: the visitor never waits for it. This lead first; if amoCRM took it, it is up again,
    // so whatever waited in the queue goes too (no point retrying the queue right after a failure)
    const payload = req.payload
    const toCrm = async () => {
      const r = await deliverToAmo(payload, lead.id as number).catch(() => null)
      if (r === 'sent') await retryQueued(payload).catch(() => null)
    }
    try {
      after(toCrm)
    } catch {
      void toCrm() // outside a Next request (tests calling the handler directly)
    }

    // the lead is stored and visible in the admin even if Telegram or amoCRM are down, so the visitor gets «thank you»
    return Response.json({ ok: true })
  },
}
