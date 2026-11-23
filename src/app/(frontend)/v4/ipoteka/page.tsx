import type { Metadata } from 'next'
import { getCompany, getHouses } from '@/lib/data'
import { annuity, formatMillions } from '@/lib/format'
import { JsonLd, faqLd } from '@/lib/seo'
import { houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { Mortgage, type MortgageHouse } from '@/v4/Mortgage'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · «Ипотека» (черновик, 13.11): расчёт платежа по дому из каталога, программы из админки, пять шагов покупки,
 * вопросы про оплату. Пример платежа написан и текстом (AEO, `18-SEO-GEO-AEO.md`, раздел 5): цифру в калькуляторе
 * поисковик не прочитает, цифру в абзаце — прочитает.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Ипотека на дом в Краснодаре и Адыгее: семейная 6%, IT, сельская, военная — расчёт платежа · Хороший дом' },
  description: 'Купить кирпичный дом с участком в ипотеку с личным брокером (одобрение 99%): семейная 6%, IT-, сельская и военная ипотека, материнский капитал во взнос.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/mortgage' },
}

const STEPS = [
  { t: 'Показ', d: 'Вживую в посёлке или по видеосвязи.' },
  { t: 'Бронь', d: '100 000 ₽ — дом снимается с продажи.' },
  { t: 'Одобрение', d: 'Подберём банк и программу, соберём документы.' },
  { t: 'Сделка', d: 'Договор и регистрация права собственности.' },
  { t: 'Ключи', d: 'Дом в предчистовой отделке, гарантия 5 лет.' },
]

export default async function V4Mortgage() {
  const [company, houses] = await Promise.all([getCompany(), getHouses({ status: 'free' })])
  const free = houses.map(houseView).sort((a, b) => a.price - b.price)
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const list: MortgageHouse[] = free.map((h) => ({ code: h.code, label: `${h.title}, ${h.estateName}`, price: h.price }))
  // пример платежа текстом: самый доступный дом, минимально возможный взнос с учётом лимита кредита
  const first = free[0]
  // та же логика, что в калькуляторе (src/v4/Mortgage.tsx): взнос — целый процент, не меньше минимума и не меньше, чем требует лимит кредита
  const share = first ? Math.max(fam.minDown, Math.ceil(((first.price - fam.limit) / first.price) * 100)) : fam.minDown
  const down = first ? Math.round(first.price * share / 100) : 0
  const pay = first ? annuity(first.price - down, fam.rate, fam.years) : 0
  const faq = (company.faq ?? []).filter((f) => /ипотек|купить|взнос|капитал/i.test(f.q + f.a))
  return (
    <div className="v3 v4">
      <V4Fonts />
      {faqLd(faq) && <JsonLd data={faqLd(faq)!} />}
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <V4PageHead eyebrow="Ипотека" ghost="Ипотека" title="Ипотека" em="на дом"
          lead={first ? `Дом за ${formatMillions(first.price)} — платёж около ${pay.toLocaleString('ru-RU')} ₽ в месяц по семейной ипотеке (${fam.rate.toLocaleString('ru-RU')} %, ${fam.years} лет, взнос ${share} % — ${down.toLocaleString('ru-RU')} ₽). Посчитайте для любого дома из каталога.` : undefined} />
        <section className="v3-sec v3-sec--sky v4-sec" style={{ paddingTop: 40 }}>
          <div className="v3-wrap">
            {list.length > 0 && <Mortgage houses={list} family={fam} />}
            <ul className="v4-progs">{(company.mortgage ?? []).map((m) => <li key={m.title}><b>{m.title}</b><span>{m.text}</span></li>)}</ul>
          </div>
        </section>
        <section className="v3-sec v4-sec">
          <div className="v3-wrap v4-head">
            <p className="v4-num">Как купить</p>
            <h2 className="v3-h2" data-move="lines">Пять шагов <em>до ключей</em></h2>
          </div>
          <ol className="v3-wrap v4-steps">
            {STEPS.map((s, k) => <li key={s.t}><span>{String(k + 1).padStart(2, '0')}</span><b>{s.t}</b><p>{s.d}</p></li>)}
          </ol>
        </section>
        {faq.length > 0 && (
          <section className="v3-sec v4-sec">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Частые вопросы</p>
              <h2 className="v3-h2" data-move="lines">Про оплату <em>коротко</em></h2>
            </div>
            <div className="v3-wrap v4-faq">
              {faq.map((f, k) => <details key={f.q} open={k === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </div>
          </section>
        )}
        <V4Final company={company} context="Ипотека v4: запись на показ" title="Подберём" em="программу" lead="Оставьте телефон: личный ипотечный брокер (одобрение 99%) бесплатно подберёт программу — Семейная 6%, IT, Сельская, Военная или материнский капитал в первый взнос — и запишет на показ." />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
