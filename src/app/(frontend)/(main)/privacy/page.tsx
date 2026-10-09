import type { Metadata } from 'next'
import { getCompany } from '@/lib/data'

export const revalidate = 60
export const metadata: Metadata = { title: 'Политика обработки персональных данных', alternates: { canonical: '/privacy' } }

// TEMPLATE: before launch the client fills legal details in the admin («Компания» → «Реквизиты»), a lawyer checks the text,
// and the client notifies Roskomnadzor as a personal data operator.
export default async function PrivacyPage() {
  const c = await getCompany()
  const operator = c.legalName || `Строительная компания «${c.name}»`
  const details = [c.inn && `ИНН ${c.inn}`, c.ogrn && `ОГРН ${c.ogrn}`, c.legalAddress].filter(Boolean).join(', ') || '[ИНН, ОГРН, юридический адрес]'
  return (
    <div className="container intro">
      <div className="prose">
        <h1 className="title title--lg">Политика обработки персональных данных</h1>
        {!c.inn && <p className="note">Шаблон. Перед запуском заполнить реквизиты оператора в админке и проверить у юриста.</p>}
        <h2>1. Оператор</h2>
        <p>
          {operator} ({details}) — далее «Оператор». Контакт по вопросам персональных данных: {c.email}.
        </p>
        <h2>2. Какие данные собираем</h2>
        <p>Имя и номер телефона из форм на сайте, а также технические данные посещения (cookie, данные Яндекс Метрики).</p>
        <h2>3. Зачем</h2>
        <p>Чтобы связаться с вами по заявке, подобрать дом, рассчитать ипотеку и организовать показ; для улучшения работы сайта.</p>
        <h2>4. Как храним и сколько</h2>
        <p>
          Данные хранятся на серверах в Российской Федерации, доступ есть только у сотрудников отдела продаж. Срок хранения — до достижения целей обработки или до
          отзыва согласия.
        </p>
        <h2>5. Ваши права</h2>
        <p>Вы можете запросить сведения о ваших данных, их уточнение или удаление и отозвать согласие, написав на {c.email}.</p>
      </div>
    </div>
  )
}
