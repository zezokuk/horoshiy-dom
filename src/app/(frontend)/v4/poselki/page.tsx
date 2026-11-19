import type { Metadata } from 'next'
import { getCompany, getEstates, getHouses, getProjects } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { byEstateStatus, estateSale, estateView, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { MapGenplanFlow, type FlowEstate } from '@/v4/MapGenplanFlow'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
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
      }
    })

  const dinskayaEstate = estates.find((e) => e.slug === 'dinskaya')
  const dinskayaHouses = dinskayaEstate ? houses.filter((h) => estateOf(h) === dinskayaEstate.id).map(houseView) : []
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }

  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <V4PageHead
          eyebrow="Посёлки и генпланы"
          ghost="Посёлки"
          title="Посёлки"
          em="под Краснодаром"
          lead="Динская, Новая Адыгея и Козет. Переключайтесь между картой посёлков и спутниковым генпланом Динской (36 участков)."
        />
        <section className="v3-sec v4-sec" style={{ paddingTop: 12 }}>
          <div className="v3-wrap">
            <MapGenplanFlow estates={flowEstates} dinskayaHouses={dinskayaHouses} family={fam} />
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
                    <span>{c.slug === 'dinskaya' ? 'Открыть генплан и дома →' : 'Подробнее о посёлке →'}</span>
                  </span>
                </a>
              )
            })}
          </div>
        </section>

        <V4Final company={company} context="Посёлки v4: запись на показ" />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
