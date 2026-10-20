/**
 * «Как вести сайт» on top of the admin dashboard: what the client's team does every month, each a link straight to the
 * right form — only the jobs of the signed-in person's role. Agreed at the meeting 14.10: their content maker runs the site.
 */
type Who = 'content' | 'sales' | 'manager'
const STEPS: { title: string; text: string; href: string; go: string; for: Who[] }[] = [
  {
    title: 'Новый дом — за минуту',
    text: 'Посёлок, проект, тип, площадь, цена. Спальни и особенности подставятся из проекта. Фото и планировку можно добавить сразу или потом.',
    href: '/admin/collections/houses/create',
    go: 'Добавить дом',
    for: ['content', 'manager'],
  },
  {
    title: 'Продан или бронь',
    text: 'Откройте дом → «Статус» → «Сохранить». На сайте и в 3D-генплане цвет поменяется сразу.',
    href: '/admin/collections/houses',
    go: 'Все дома',
    for: ['content', 'sales', 'manager'],
  },
  {
    title: 'Новый посёлок',
    text: 'Пока домов нет — статус «Скоро»: на сайте появится страница с формой «Узнать о старте продаж». Когда начнутся продажи — «Идут продажи».',
    href: '/admin/collections/estates/create',
    go: 'Добавить посёлок',
    for: ['content', 'manager'],
  },
  {
    title: 'Видео комнат на плане',
    text: 'Проекты домов → нужный тип → «Точки на плане» → у кружка поле «Видео». Вертикальное, до минуты, в MP4.',
    href: '/admin/collections/projects',
    go: 'Проекты домов',
    for: ['content'],
  },
  {
    title: 'Страница под рекламу',
    text: 'Промо-страницы → создать: заголовок как в объявлении, посёлок, оффер. Свободные дома и «что рядом» подтянутся сами. Ссылку — в Директ и VK.',
    href: '/admin/collections/landings/create',
    go: 'Создать промо-страницу',
    for: ['content', 'manager'],
  },
  {
    title: 'Заявки',
    text: 'В каждой видно, с какого дома и посёлка она пришла и откуда человек: реклама, поиск или напрямую. Меняйте статус по ходу работы.',
    href: '/admin/collections/leads',
    go: 'Открыть заявки',
    for: ['sales', 'manager'],
  },
  // settings: admins only (for: [] — the cards above go to their roles, these to nobody else)
  {
    title: 'Как выглядит сайт',
    text: 'Первый экран главной (5 вариантов), цвета — фирменные или свои, приёмы: нить, веер проектов, переходы. Выключенный приём заменяется простым вариантом.',
    href: '/admin/globals/design',
    go: 'Внешний вид',
    for: [],
  },
  {
    title: 'Как сайт выглядит в поиске',
    text: 'Заголовки и описания страниц для Яндекса и Google, код подтверждения Вебмастера, картинка для ссылок в мессенджерах. У посёлков, проектов и промо-страниц — свои поля «SEO».',
    href: '/admin/globals/seo',
    go: 'SEO и поиск',
    for: [],
  },
]

export function Guide({ user }: { user?: { role?: string | null } | null }) {
  const role = user?.role
  // admins (and an unknown role) see every card
  const steps = STEPS.filter((s) => !role || role === 'admin' || s.for.includes(role as Who))
  if (!steps.length) return null
  return (
    <section style={{ marginBottom: 'calc(var(--base) * 2)' }}>
      <h2 style={{ margin: '0 0 calc(var(--base) * 0.75)' }}>Как вести сайт</h2>
      <div
        style={{
          display: 'grid',
          gap: 'calc(var(--base) * 0.75)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', // six: three in a row on a laptop
        }}
      >
        {steps.map((s, i) => (
          <a
            key={s.title}
            href={s.href}
            style={{
              display: 'grid',
              gap: 8,
              alignContent: 'start',
              padding: 'calc(var(--base) * 0.9)',
              borderRadius: 'var(--style-radius-m, 8px)',
              border: '1px solid var(--theme-elevation-150)',
              background: 'var(--theme-elevation-50)',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.6 }}>{String(i + 1).padStart(2, '0')}</span>
            <b style={{ fontSize: 16 }}>{s.title}</b>
            <span style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.8 }}>{s.text}</span>
            <span style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{s.go} →</span>
          </a>
        ))}
      </div>
    </section>
  )
}
