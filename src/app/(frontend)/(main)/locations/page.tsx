import type { Metadata } from 'next'
import { EstatesView } from '@/components/EstatesView'
import { LeadInline } from '@/components/LeadForm'
import { PromoCards } from '@/components/PromoCards'
import { Regions, type RegionStats } from '@/components/Regions'
import { Words } from '@/components/Words'
import { getCompany, getEstates, getHouses, getPromos, getRegions } from '@/lib/data'
import { mainHref } from '@/lib/site'
import { byEstateStatus, estateView, promoView, regionView } from '@/lib/view'

export const dynamic = 'force-dynamic' // shows statuses and counts: always fresh (see collections/revalidate.ts)

export const metadata: Metadata = {
  title: 'Где мы строим: регионы и посёлки',
  description: 'Посёлки «Хорошего дома» на карте: где строим сейчас и куда приходим скоро. Подпишитесь — сообщим об акциях и новых посёлках.',
  alternates: { canonical: '/locations' },
}

/**
 * The third way in from the home page: «just looking». Regions, every estate on one map, promos —
 * and a soft «tell me later» form: the lead is marked «на будущее» for promo mailings, not for a sales call.
 */
export default async function LocationsPage() {
  const [company, regions, estates, houses, promos] = await Promise.all([getCompany(), getRegions(), getEstates(), getHouses(), getPromos()])
  const views = regions.map(regionView)
  const estateViews = byEstateStatus(estates.map((e) => estateView(e, houses)))
  const stats: Record<string, RegionStats> = {}
  for (const r of views) {
    const mine = estateViews.filter((e) => e.regionSlug === r.slug)
    const prices = mine.map((e) => e.priceFrom).filter((p): p is number => p !== null)
    stats[r.slug] = {
      estates: mine.length,
      free: mine.reduce((s, e) => s + e.free, 0),
      priceFrom: prices.length ? Math.min(...prices) : null,
      cover: mine[0]?.coverCard,
    }
  }
  const future = { context: 'Локации: на будущее', phone: company.phone, interest: 'future' as const }

  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>Локации</span>
        </nav>
        <h1 className="title title--lg">Где мы строим</h1>
        <p className="lead">
          Можно просто посмотреть: какие посёлки уже стоят, где сейчас продаём и куда приходим скоро. Когда будете готовы — подберём дом, а пока
          можем сообщать об акциях и новых посёлках.
        </p>
      </div>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Регионы</span>
            <Words text="Выберите *регион*" />
          </div>
          <Regions regions={views} stats={stats} />
        </div>
      </section>

      <section className="section section--paper" id="estates">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Посёлки</span>
              <Words text="Все посёлки *на карте*" />
            </div>
            <p className="lead" data-reveal>
              Нажмите на посёлок — откроется его 3D-генплан: улицы, участки и свободные дома с ценами.
            </p>
          </div>
          <EstatesView estates={estateViews} showRegion={views.length > 1} />
          <LeadInline
            title="Сообщить об акциях и новых посёлках?"
            text="Оставьте телефон — напишем, когда появятся скидки, новые дома или откроются продажи в вашем регионе. Без навязчивых звонков."
            cta="Подписаться"
            target={future}
          />
        </div>
      </section>

      {promos.length > 0 && (
        <section className="section" id="promo">
          <div className="container">
            <div className="head" data-reveal>
              <span className="idx">Акции</span>
              <Words text="Сейчас *выгодно*" />
            </div>
            <PromoCards promos={promos.map(promoView)} />
          </div>
        </section>
      )}
    </>
  )
}
