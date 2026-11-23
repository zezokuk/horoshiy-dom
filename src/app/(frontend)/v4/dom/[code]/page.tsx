import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { LeadForm } from '@/components/LeadForm'
import { getCompany, getHouse, getHouses, img } from '@/lib/data'
import { STATUS_LABEL, formatArea, formatMillions, formatPrice } from '@/lib/format'
import { JsonLd, breadcrumbsLd, houseLd } from '@/lib/seo'
import { mainHref } from '@/lib/site'
import { cleanPhotoUrl, houseView } from '@/lib/view'
import { HouseDetailGallery } from '@/v4/HouseDetailGallery'
import { housePhotography } from '@/v4/housePhotography'
import { Mortgage } from '@/v4/Mortgage'
import { V4Bar, V4Footer } from '@/v4/Shell'
import { SLIDE_CODE, v4img } from '@/v4/images'
import '@/v3/v3.css'
import '@/v4/v4.css'
import '@/v4/HouseDetail.css'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const house = await getHouse((await params).code)
  if (!house) return {}
  const h = houseView(house)
  return {
    title: { absolute: `${h.title} · ${h.estateName} · ${formatMillions(h.price)} — Хороший дом` },
    description: `${h.title}, ${formatArea(h.area)} м²${h.plot ? `, участок ${h.plot}` : ''}. ${h.estateName}. ${STATUS_LABEL[h.status]}.`,
    robots: { index: false, follow: false },
    alternates: { canonical: h.href },
  }
}

export default async function HouseDetail({ params }: Props) {
  const house = await getHouse((await params).code)
  if (!house || typeof house.estate !== 'object') notFound()
  const estate = house.estate
  const region = typeof estate.region === 'object' ? estate.region : null
  const project = typeof house.project === 'object' ? house.project : null
  const h = houseView(house)
  const [company, freeHouses] = await Promise.all([getCompany(), getHouses({ status: 'free' })])
  const related = freeHouses.filter((other) => other.code !== h.code).sort((a, b) => Math.abs(a.price - h.price) - Math.abs(b.price - h.price)).slice(0, 3)
  const typeName = project?.name || h.title.split(',')[0]
  const [type, ...addressParts] = h.title.split(', ').map((s) => s.replace(/^уч\.\s*/i, 'Участок № '))
  const address = addressParts.join(' · ')
  const location = estate.slug === 'dinskaya' ? 'Дом в Динской' : 'Кирпичный дом'
  const slides = [...housePhotography(h.code)]
  const photo = h.photo || cleanPhotoUrl(img(project?.photo, 'wide'))
  if (!slides.length) {
    const projectFrame = project?.slug === 'tip-5' ? '/v4/houses/type5-front.webp' : v4img(SLIDE_CODE[project?.slug ?? ''])?.src
    if (projectFrame) slides.push({ src: projectFrame, alt: `Фасад дома по проекту «${typeName}»`, caption: `Визуализация проекта «${typeName}»` })
    if (photo) slides.push({ src: photo, alt: `Фасад из презентации «${h.title}»`, caption: `Изображение проекта «${typeName}»` })
  }
  const gallery = h.plan ? [...slides, { src: h.plan, caption: `Планировка · ${type}`, alt: `Планировка «${h.title}»`, plan: true }] : slides
  const { rate, years, minDown, limit } = company.family ?? {}
  const family = rate != null && years && minDown != null && limit ? { rate, years, minDown, limit } : null
  const canVisit = h.status === 'free'
  const cta = canVisit ? 'Записаться на показ' : 'Подобрать похожий дом'
  const facts = [
    { label: 'Площадь дома', value: `${formatArea(h.area)} м²` },
    ...(h.plot ? [{ label: 'Участок', value: h.plot }] : []),
    ...(h.bedrooms ? [{ label: 'Спальни', value: String(h.bedrooms) }] : []),
    { label: 'Отделка', value: 'Предчистовая' },
  ]
  const context = `${canVisit ? 'Показ дома' : 'Подбор похожего дома'}: ${h.title}, ${estate.name}`

  return (
    <div className="v3 v4 hd-page">
      {region && <JsonLd data={houseLd(h, estate, region, company.legalName || company.name)} />}
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/v4') }, { name: 'Дома в продаже', url: mainHref('/v4/doma') }, { name: h.title, url: mainHref(`/v4/dom/${h.code}`) }])} />
      <V4Bar phone={company.phone} always />
      <main className="hd-wrap">
        <nav className="hd-path" aria-label="Навигация по каталогу">
          <a href="/v4#doma">← К выбору дома</a><span aria-hidden>/</span><a href={`/v4/poselok/${estate.slug}`}>{estate.name}</a>
        </nav>
        <div className="hd-spread">
          <div className="hd-identity">
            <p className="hd-status" data-status={h.status}><i />{STATUS_LABEL[h.status]}</p>
            <h1>{location}</h1>
            <p className="hd-address">{estate.slug !== 'dinskaya' && <>{estate.name} · </>}{type}{address && <> · {address}</>}</p>
          </div>
          {gallery.length > 0 && <HouseDetailGallery frames={gallery} />}
          <div className="hd-offer">
            <dl className="hd-metrics">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
            <p className="hd-price">{formatPrice(h.price)}</p>
            <p className="hd-price-note">Стоимость дома с участком</p>
            <a className="hd-visit" href="#evf-form">{cta}<span aria-hidden>↗</span></a>
            {family && canVisit && <a className="hd-finance" href="#ipoteka">Рассчитать ипотеку <span aria-hidden>↓</span></a>}
          </div>
        </div>
        {(h.plan || h.features.length > 0) && <section className="hd-section hd-layout" id="plan">
          <div className="hd-section-copy">
            <h2>Внутри дома</h2>
            <dl className="hd-spec">
              <div><dt>Площадь</dt><dd>{formatArea(h.area)} м²</dd></div>
              {Boolean(h.mansard) && <div><dt>Мансарда</dt><dd>{formatArea(h.mansard!)} м²</dd></div>}
              {Boolean(h.bedrooms) && <div><dt>Спальни</dt><dd>{h.bedrooms}</dd></div>}
              {Boolean(h.bathrooms) && <div><dt>Санузлы</dt><dd>{h.bathrooms}</dd></div>}
              <div><dt>Отделка</dt><dd>Предчистовая (White Box)</dd></div>
              <div><dt>Стены</dt><dd>370 мм (блок + утеплитель + кирпич)</dd></div>
              <div><dt>Инженерия</dt><dd>15 кВт · вода · септик 9 м³ · газ</dd></div>
            </dl>
            {h.features.length > 0 && <p className="hd-features">{h.features.join(' · ')}</p>}
          </div>
          {h.plan && <figure className="hd-plan">
            <a href={h.plan} target="_blank" rel="noreferrer" aria-label="Открыть планировку в полном размере">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.plan} loading="lazy" alt={`Планировка дома «${h.title}»`} />
            </a>
            <figcaption>Планировка · {type}<span><a href={h.plan} download>Скачать планировку ↓</a> · <a href={h.plan} target="_blank" rel="noreferrer">Развернуть ↗</a></span></figcaption>
          </figure>}
        </section>}
        {family && canVisit && <section className="hd-section hd-mortgage" id="ipoteka">
          <h2>Ипотека на этот дом</h2>
          <Mortgage houses={[{ code: h.code, label: h.title, price: h.price }]} family={family} />
        </section>}
        <section className="hd-book" id="evf-form" aria-labelledby="hd-book-title">
          <div className="hd-book-copy">
            <h2 id="hd-book-title">{canVisit ? 'Посмотреть дом вживую' : 'Найти похожий дом'}</h2>
            <p>{canVisit ? 'Оставьте телефон. Менеджер свяжется с вами и согласует время показа.' : 'Менеджер подберёт свободные дома с похожей площадью и стоимостью.'}</p>
            <div className="hd-book-house">{slides[0] && <Image src={slides[0].src} width={78} height={58} unoptimized alt="" />}<div><b>{h.title}</b><span>{estate.name} · {formatMillions(h.price)}</span></div></div>
          </div>
          <div className="hd-form"><LeadForm light cta={cta} target={{ interest: 'buy', house: h.code, estate: estate.slug, region: h.regionSlug, context, phone: company.phone }} /></div>
        </section>
        {related.length > 0 && <section className="hd-section hd-alternatives">
          <h2>Другие дома</h2>
          <ul>{related.map((other) => {
            const v = houseView(other)
            return <li key={v.code}><a href={`/v4/dom/${v.code}`}><span>{v.estateName} <b>{v.title}</b></span><span>{formatArea(v.area)} м²</span><strong>{formatMillions(v.price)}</strong><span aria-hidden>↗</span></a></li>
          })}</ul>
          <a className="hd-finance" href="/v4/doma">Все дома в продаже →</a>
        </section>}
      </main>
      <V4Footer since={company.since} />
    </div>
  )
}
