import type { Metadata } from 'next'
import { getCompany } from '@/lib/data'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead, telOf } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · «Контакты» (черновик, 13.11): офисы с маршрутом в Яндекс Картах, телефон, почта, Telegram, реквизиты (появятся, когда
 * юрлицо заполнят в админке), форма записи на показ.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Контакты «Хорошего дома»: офисы в Динской и Козете, телефон, запись на показ' },
  description: 'Офисы продаж «Хорошего дома»: ст. Динская и аул Козет (КП «Южный ветер»). Телефон, часы работы, маршрут, запись на показ.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/contacts' },
}

const route = (address: string) => `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`

export default async function V4Contacts() {
  const company = await getCompany()
  const tel = telOf(company.phone)
  const legal = [company.legalName, company.inn && `ИНН ${company.inn}`, company.ogrn && `ОГРН ${company.ogrn}`, company.legalAddress].filter(Boolean)
  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <V4PageHead eyebrow="Контакты" ghost="Связь" title="Контакты" em="и офисы"
          lead="Покажем дома вживую в посёлке или по видеосвязи, если вы в другом городе. Позвоните или оставьте телефон — перезвоним." />
        <section className="v3-sec v4-sec" style={{ paddingTop: 20 }}>
          <div className="v3-wrap v4-contacts">
            {(company.offices ?? []).map((o) => (
              <div key={o.title} className="v4-contacts__card" data-move="up">
                <p className="v4-num">Офис продаж</p>
                <h2>{o.title}</h2>
                <p>{o.address}</p>
                {o.hours && <p className="v3-note">{o.hours}</p>}
                <a className="v4-types__all" href={route(o.address)} target="_blank" rel="noreferrer">Маршрут в Яндекс Картах →</a>
              </div>
            ))}
            <div className="v4-contacts__card v4-contacts__card--main" data-move="up">
              <p className="v4-num">Отдел продаж</p>
              {company.phone && <a className="v4-contacts__tel" href={tel ? `tel:${tel}` : undefined}>{company.phone}</a>}
              {company.email && <p><a href={`mailto:${company.email}`}>{company.email}</a></p>}
              {company.telegram && <p><a href={company.telegram} target="_blank" rel="noreferrer">Telegram-канал →</a></p>}
            </div>
          </div>
          {legal.length > 0 && <p className="v3-wrap v3-note">{legal.join(' · ')}</p>}
        </section>
        <V4Final company={company} context="Контакты v4: запись на показ" />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
