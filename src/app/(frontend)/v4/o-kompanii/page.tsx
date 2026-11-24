import type { Metadata } from 'next'
import { getCompany, getEstates, getHouses, img, plural } from '@/lib/data'
import { estateView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { BRAND_VALUES, FOUNDERS } from '@/v4/founders'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import { V4Motion } from '@/v4/V4Motion'
import '@/v3/v3.css'
import '@/v4/v4.css'
import '@/v4/catalogV4.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'О компании «Хороший дом»: строим кирпичные дома на Юге России с 2014 года' },
  description: 'СК «Хороший дом»: с 2014 года строим готовые кирпичные дома в собственных посёлках по своим проектам. Более 200 домов, 15+ планировок, гарантия 5 лет.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/about' },
}

const SKIP = ['Не хуже особняков', 'Дом за 6 месяцев']

const BUILT_GALLERY = [
  { src: '/v4/houses/type5-front.webp', cap: 'Дом по проекту «Тип 5» · главный фасад' },
  { src: '/v4/houses/type10-front.webp', cap: 'Дома по проекту «Тип 10» · вид с улицы' },
  { src: '/v4/houses/type5-side.webp', cap: 'Кирпичная кладка, крыльцо и благоустроенная территория' },
  { src: '/v4/houses/type10-entry.webp', cap: 'Дом по проекту «Тип 10» · вход со двора' },
] as const

export default async function V4About() {
  const [company, estates, houses] = await Promise.all([getCompany(), getEstates(), getHouses()])
  const views = estates.map((e) => estateView(e, houses))
  const live = views.filter((v) => v.status !== 'planned')
  const f = company.founder
  const founderPhoto = img(f?.photo, 'card')
  const facts = [
    { v: '200+', l: 'готовых домов построено и сдано с 2014 года' },
    { v: '15+', l: 'собственных планировок одно- и двухэтажных домов' },
    { v: String(company.since || 2014), l: 'год основания — строим только на своей земле' },
    { v: String(live.length), l: `${plural(live.length, 'жилой посёлок', 'жилых посёлка', 'жилых посёлков')} в собственных проектах на Юге России` },
    { v: '5 лет', l: 'гарантия на конструктив и капитальные дефекты' },
  ]
  const principles = (company.advantages ?? [])
    .filter((a) => !SKIP.includes(a.title))
    .map((a) => ({
      ...a,
      text: (a.text ?? '').replace(/12\s+типовых\s+проектов/gi, 'Более 15 собственных планировок'),
    }))

  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <V4Motion />
        <V4PageHead eyebrow="О компании" ghost="2014" title="Строим дома" em={company.since ? `с ${company.since} года` : 'на своей земле'}
          lead="Начинали с одного таунхауса в 2014 году. Сегодня проектируем и строим целые коттеджные посёлки — только на собственной земле, с предчистовой отделкой White Box и понятной ценой." />

        <section className="v3-sec v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">Команда</p>
              <h2 className="v3-h2" data-move="lines">Кто строит <em>ваш дом</em></h2>
            </div>
            <p className="v3-lead">Учредители «Хорошего дома» выбирают участки, проектируют дома и следят за строительством.</p>
          </div>
          <div className="v3-wrap v4-founders v4-founders--editorial" style={{ marginTop: 28 }}>
            {FOUNDERS.map((person) => (
              <article key={person.id} className="v4-founder-card" data-move="up">
                <div className="v4-founder-card__ava" aria-hidden>
                  {person.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.photo} alt={person.name} loading="lazy" />
                  ) : (
                    person.initials
                  )}
                </div>
                <div className="v4-founder-card__body">
                  <h3>{person.name}</h3>
                  <p className="v4-founder-card__role">{person.role}</p>
                  <p className="v4-founder-card__q">{person.quote}</p>
                </div>
              </article>
            ))}
          </div>
          <ul className="v3-wrap v4-values v4-values--stagger" style={{ marginTop: 32 }}>
            {BRAND_VALUES.map((v) => (
              <li key={v.n} data-move="up">
                <span>{v.n}</span>
                <b>{v.title}</b>
                <p>{v.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="v3-sec v3-sec--linen v4-sec v4-nums" style={{ paddingTop: 40 }}>
          <div className="v3-wrap v4-nums__rows v4-nums__rows--alt">
            {facts.map((x) => <div className="v4-nums__row" key={x.l}><b>{x.v}</b><span>{x.l}</span></div>)}
          </div>
        </section>

        <section className="v3-sec v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">Живые улицы</p>
              <h2 className="v3-h2" data-move="lines">Дома <em>в наших посёлках</em></h2>
            </div>
            <p className="v3-lead">Собственные улицы, одинаковый архитектурный стиль, проверенные временем кирпичные фасады и реальные жилые посёлки без долгостроя.</p>
          </div>
          <div className="v3-wrap v4-built-strip">
            {BUILT_GALLERY.map((item) => (
              <figure key={item.src} className="v4-built-item" data-move="up">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt={item.cap} loading="lazy" />
                <figcaption>{item.cap}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {f?.name && f.quote && (
          <section className="v3-sec v4-sec">
            <div className="v3-wrap v3-split v4-founder">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {founderPhoto && <img src={founderPhoto} alt={f.name} loading="lazy" />}
              <blockquote>
                <p>«{f.quote}»</p>
                <cite>{f.name}{f.role ? ` · ${f.role}` : ''}</cite>
              </blockquote>
            </div>
          </section>
        )}

        {principles.length > 0 && (
          <section className="v3-sec v4-sec">
            <div className="v3-wrap v4-about-principles">
              <div className="v4-head">
                <p className="v4-num">Как мы строим</p>
                <h2 className="v3-h2" data-move="lines">Принципы <em>без украшений</em></h2>
                <p className="v3-lead">Один подрядчик на весь цикл: от покупки земли и проекта до газа на участке и передачи ключей.</p>
              </div>
              <ul className="v4-progs v4-progs--balanced">
                {principles.map((a) => <li key={a.title} data-move="up"><b>{a.title}</b><span>{a.text}</span></li>)}
              </ul>
            </div>
          </section>
        )}

        <section className="v3-sec v3-sec--mist v4-sec">
          <div className="v3-wrap v4-head">
            <p className="v4-num">Наши посёлки</p>
            <h2 className="v3-h2" data-move="lines">Что уже <em>построено</em></h2>
          </div>
          <ul className="v3-wrap v4-near v4-near--estates">
            {views.map((v) => (
              <li key={v.slug}>
                <a href={`/v4/poselok/${v.slug}`}>{v.name}</a>
                <b>{v.status === 'soldOut' ? `продан${v.homes ? ` · ${v.homes} ${plural(v.homes, 'дом', 'дома', 'домов')}` : ''}` : v.status === 'planned' ? 'скоро старт продаж' : `${v.free} в продаже`}</b>
              </li>
            ))}
          </ul>
        </section>

        <V4Final company={company} context="О компании v4: запись на показ" title="Посмотрите" em="построенное" lead="Приезжайте в «Южный ветер» или Динскую: покажем дома, в которых уже живут, и те, что продаются." />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
