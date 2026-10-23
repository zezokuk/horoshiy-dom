import type { Metadata } from 'next'
import { MortgageCalc } from '@/components/MortgageCalc'
import { getCompany } from '@/lib/data'
import { mainHref } from '@/lib/site'
import { pageMeta } from '@/lib/look'

export const revalidate = 60

const META: Metadata = {
  title: 'Ипотека и способы покупки',
  description: 'Ипотека на дома «Хорошего дома»: программы, калькулятор платежа, оформление сделки и регистрации за 2 недели.',
  alternates: { canonical: '/mortgage' },
}
// title and description can be set in the admin: «SEO и поиск» → mortgage
export const generateMetadata = () => pageMeta('mortgage', META)

export default async function MortgagePage() {
  const company = await getCompany()
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>Ипотека</span>
        </nav>
        <h1 className="title title--lg">Ипотека и способы покупки</h1>
        <p className="lead">Поможем выбрать программу, соберём документы и оформим сделку и регистрацию за 2 недели.</p>
      </div>
      <div className="container" style={{ display: 'grid', gap: 40, paddingBottom: 40 }}>
        {!!company.mortgage?.length && (
          <div className="features">
            {company.mortgage.map((m, i) => (
              <div key={m.id ?? m.title} className="feature">
                <span className="feature__num">0{i + 1}</span>
                <h2>{m.title}</h2>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        )}
        <MortgageCalc />
        <div className="prose">
          <h2>Как проходит покупка</h2>
          <ul className="dots">
            <li>Подбираем дом и программу, считаем платёж под ваш доход.</li>
            <li>Подаём заявку в банк — помогаем с документами.</li>
            <li>Показываем дом, согласуем условия, подписываем договор.</li>
            <li>Регистрируем право собственности — ключи ваши.</li>
          </ul>
          <p className="note">
            Условия ипотеки (ставка, первоначальный взнос, требования к заёмщику) определяет банк-кредитор и могут меняться. Информация на сайте не является
            публичной офертой.
          </p>
        </div>
      </div>
    </>
  )
}
