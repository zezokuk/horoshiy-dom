import type { Metadata } from 'next'
import { getCompany } from '@/lib/data'

export const revalidate = 60
export const metadata: Metadata = {
  title: 'Политика обработки персональных данных',
  description: 'Какие данные собирает сайт «Хорошего дома», зачем, кому передаёт и как их удалить.',
  alternates: { canonical: '/privacy' },
}

// TEMPLATE: before launch the client fills legal details in the admin («Компания» → «Реквизиты»), a lawyer checks the text,
// and the client notifies Roskomnadzor as a personal data operator.
export default async function PrivacyPage() {
  const c = await getCompany()
  const operator = c.legalName || `Строительная компания «${c.name}»`
  const details = [c.inn && `ИНН ${c.inn}`, c.ogrn && `ОГРН ${c.ogrn}`, c.legalAddress].filter(Boolean).join(', ') || '[ИНН, ОГРН, юридический адрес]'
  // the same switch as in leadEndpoint: with a bot and without TELEGRAM_PERSONAL_DATA=0 the name and phone go to Telegram
  const telegramContacts = Boolean(process.env.TELEGRAM_BOT_TOKEN) && process.env.TELEGRAM_PERSONAL_DATA !== '0'
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
        <p>
          Имя и номер телефона из форм на сайте; страницу, с которой отправлена заявка, и рекламный источник перехода (метки UTM); технические данные посещения:
          cookie, данные сервисов Яндекс Метрика и VK Реклама.
        </p>
        <h2>3. Зачем</h2>
        <p>Чтобы связаться с вами по заявке, подобрать дом, рассчитать ипотеку и организовать показ; чтобы понимать, какая реклама и какие страницы полезны.</p>
        <h2>4. Кому передаём</h2>
        <p>
          Заявка попадает в систему учёта клиентов Оператора (amoCRM) и сотруднику отдела продаж.
          {telegramContacts && ' Уведомление о заявке с именем и телефоном сотрудник получает в мессенджере Telegram.'} Обезличенные данные посещения
          обрабатывают Яндекс Метрика и VK Реклама. Третьим лицам для других целей данные не передаются.
        </p>
        <h2>5. Cookie</h2>
        <p>
          Сайт использует cookie и хранилище браузера, чтобы запомнить рекламный источник визита, и счётчики Яндекс Метрики и VK Рекламы. Отключить cookie можно в
          настройках браузера — формы на сайте продолжат работать.
        </p>
        <h2>6. Как храним и сколько</h2>
        <p>
          Данные хранятся на серверах в Российской Федерации, доступ есть только у сотрудников отдела продаж. Срок хранения — до достижения целей обработки или до
          отзыва согласия.
        </p>
        <h2>7. Ваши права</h2>
        <p>Вы можете запросить сведения о ваших данных, их уточнение или удаление и отозвать согласие, написав на {c.email}.</p>
      </div>
    </div>
  )
}
