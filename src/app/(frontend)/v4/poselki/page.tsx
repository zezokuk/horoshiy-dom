import type { Metadata } from 'next'
import { getCompany, getEstates, getHouses } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { byEstateStatus, estateSale, estateView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { EstateMap, type MapEstate } from '@/v4/EstateMap'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/** v4 · «Посёлки» (черновик, 13.11): карта Яндекса с плашками и обложки клиента карточками; всё ведёт на /v4/poselok/<slug>. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Коттеджные посёлки под Краснодаром: Динская, Новая Адыгея, Козет — на карте · Хороший дом' },
  description: 'Посёлки «Хорошего дома» под Краснодаром на карте: что продаётся, цены, минуты до города, школы и магазины рядом.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/locations' },
}

export default async function V4Places() {
  const [company, estates, houses] = await Promise.all([getCompany(), getEstates(), getHouses()])
  const views = byEstateStatus(estates.map((e) => estateView(e, houses)))
  const nearby = new Map(estates.map((e) => [String(e.slug), (e.nearby ?? []).map((x) => ({ label: x.label, value: x.value }))]))
  const sale = (c: (typeof views)[number]) => `${estateSale(c)}${c.priceFrom && c.status === 'selling' ? ` · от ${formatMillions(c.priceFrom)}` : ''}`
  const mapEstates: MapEstate[] = views
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({ slug: c.slug, name: c.name, place: c.place, lat: c.lat!, lng: c.lng!, status: c.status, href: `/v4/poselok/${c.slug}`, cover: c.coverCard || c.cover, sale: sale(c), nearby: nearby.get(c.slug) ?? [] }))
  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <V4PageHead eyebrow="Посёлки" ghost="Кубань" title="Посёлки" em="под Краснодаром"
          lead="Новая Адыгея и Козет — в 15–25 минутах от Краснодара, Динская — в 40 минутах. Нажмите на посёлок: в карточке — что продаётся и что рядом." />
        <section className="v3-sec v3-sec--mist v4-sec" style={{ paddingTop: 40 }}>
          <div className="v3-wrap"><EstateMap estates={mapEstates} /></div>
        </section>
        <section className="v3-sec v4-sec">
          <div className="v3-wrap v3-covers">
            {views.map((c) => (
              <a key={c.slug} href={`/v4/poselok/${c.slug}`} className={`v3-cover v3-cover--${c.status}`} data-move="up">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.coverCard || c.cover ? <img src={c.coverCard || c.cover} alt={`Посёлок «${c.name}»`} loading="lazy" data-move="reveal" /> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <span className="v3-cover__blank"><img src="/v3/logo-white.svg" alt="" width={140} height={65} /><b>{c.name}</b></span>
                )}
                <div className="v3-cover__body">
                  <h2 className="v3-sr">{c.name}</h2>
                  <p>{sale(c)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
        <V4Final company={company} context="Посёлки v4: запись на показ" />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
