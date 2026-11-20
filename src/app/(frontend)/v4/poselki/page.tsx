import type { Metadata } from 'next'
import { getCompany, getEstates, getHouses, getProjects } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { byEstateStatus, estateSale, estateView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { MapGenplanFlow, type FlowEstate } from '@/v4/MapGenplanFlow'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import { v4img } from '@/v4/images'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · «Посёлки» (без старых обложек с воздушным змеем):
 * сверху интерактивная карта посёлков (без наложения пинов) + спутниковый генплан Динской в 1 клик,
 * ниже — чистые карточки всех посёлков в стиле ПИК.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Коттеджные посёлки под Краснодаром: Динская, Новая Адыгея, Козет — на карте и генплане · Хороший дом' },
  description: 'Посёлки «Хорошего дома» под Краснодаром на карте и спутниковом генплане: что продаётся, цены, минуты до города.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/locations' },
}

export default async function V4Places() {
  const [company, estates, houses, projects] = await Promise.all([getCompany(), getEstates(), getHouses(), getProjects()])
  const views = byEstateStatus(estates.map((e) => estateView(e, houses)))
  const nearby = new Map(estates.map((e) => [String(e.slug), (e.nearby ?? []).map((x) => ({ label: x.label, value: x.value }))]))
  const estateOf = (h: (typeof houses)[number]) => (typeof h.estate === 'object' ? h.estate?.id : h.estate)
  const projectOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)

  const typesByEstate = new Map<number, string[]>()
  for (const h of houses) {
    const eid = estateOf(h)
    const pid = projectOf(h)
    const pName = projects.find((p) => p.id === pid)?.name
    if (eid && pName) {
      const list = typesByEstate.get(eid) ?? []
      if (!list.includes(pName)) list.push(pName)
      typesByEstate.set(eid, list)
    }
  }

  const flowEstates: FlowEstate[] = views
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => {
      const est = estates.find((x) => x.slug === c.slug)
      const tNames = (est ? typesByEstate.get(est.id) : undefined) ?? []
      tNames.sort((a, b) => (Number(a.match(/\d+/)?.[0]) || 99) - (Number(b.match(/\d+/)?.[0]) || 99))
      const freeMine = est ? houses.filter((h) => estateOf(h) === est.id && h.status === 'free') : []
      const single = c.status === 'selling' && c.free === 1 && c.slug !== 'dinskaya' && freeMine[0] ? freeMine[0] : undefined
      return {
        slug: c.slug,
        name: c.name,
        place: c.place,
        lat: c.lat!,
        lng: c.lng!,
        status: c.status,
        homes: c.homes,
        free: c.free,
        priceFrom: c.priceFrom,
        sale: `${estateSale(c)}${c.priceFrom && c.status === 'selling' ? ` · от ${formatMillions(c.priceFrom)}` : ''}`,
        href: `/v4/poselok/${c.slug}`,
        types: tNames,
        nearby: nearby.get(c.slug) ?? [],
        singleHouse: single
          ? {
              code: single.code,
              title: single.title,
              area: single.area,
              plot: single.plot ?? null,
              price: single.price,
              href: `/v4/dom/${single.code}`,
            }
          : undefined,
      }
    })

  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <V4PageHead
          eyebrow="Посёлки"
          ghost="Посёлки"
          title="Посёлки"
          em="под Краснодаром"
          lead="Динская, Новая Адыгея и Козет. Наведите на посёлок для справки, нажмите — карта приблизится, и откройте страницу посёлка с генпланом и типами домов."
        />
        <section className="v3-sec v4-sec" style={{ paddingTop: 12 }}>
          <div className="v3-wrap">
            <MapGenplanFlow estates={flowEstates} />
          </div>
        </section>

        {/* Чистые карточки посёлков без старых обложек */}
        <section className="v3-sec v4-sec" style={{ paddingTop: 0 }}>
          <div className="v3-wrap v4-estates-grid">
            {views.map((c) => {
              const est = estates.find((x) => x.slug === c.slug)
              const tNames = (est ? typesByEstate.get(est.id) : undefined) ?? []
              return (
                <a key={c.slug} href={`/v4/poselok/${c.slug}`} className="v4-estate-card">
                  <div className="v4-estate-card__top">
                    <span className={`v3-status${c.status !== 'selling' ? ' v3-status--off' : ''}`}>
                      <i />
                      {estateSale(c)}
                    </span>
                    {c.priceFrom && c.status === 'selling' && <b className="v4-estate-card__price">от {formatMillions(c.priceFrom)}</b>}
                  </div>
                  <h2>{c.name}</h2>
                  <p className="v4-estate-card__place">
                    {c.place}
                    {c.homes ? ` · ${c.homes} участков` : ''}
                  </p>
                  {tNames.length > 0 && (
                    <div className="v4-mflow__stypes">
                      {tNames.slice(0, 6).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  )}
                  <span className="v4-pik-btn v4-estate-card__cta">
                    <span>Смотреть посёлок →</span>
                  </span>
                </a>
              )
            })}
          </div>
        </section>

        <V4Final company={company} context="Посёлки v4: запись на показ" bg={v4img('И4')?.src ?? '/design/hero-morning.webp'} />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
