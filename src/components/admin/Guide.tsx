/**
 * «Как вести сайт» on top of the admin dashboard: the five things the client's team does every month,
 * each a link straight to the right form. Agreed at the meeting 14.10: their content maker runs the site without us.
 */
const STEPS: { title: string; text: string; href: string; go: string }[] = [
  {
    title: 'Новый дом — за минуту',
    text: 'Посёлок, проект, тип, площадь, цена. Спальни и особенности подставятся из проекта. Фото и планировку можно добавить сразу или потом.',
    href: '/admin/collections/houses/create',
    go: 'Добавить дом',
  },
  {
    title: 'Продан или бронь',
    text: 'Откройте дом → «Статус» → «Сохранить». На сайте и в 3D-генплане цвет поменяется сразу.',
    href: '/admin/collections/houses',
    go: 'Все дома',
  },
  {
    title: 'Новый посёлок',
    text: 'Пока домов нет — статус «Скоро»: на сайте появится страница с формой «Узнать о старте продаж». Когда начнутся продажи — «Идут продажи».',
    href: '/admin/collections/estates/create',
    go: 'Добавить посёлок',
  },
  {
    title: 'Видео комнат на плане',
    text: 'Проекты домов → нужный тип → «Точки на плане» → у кружка поле «Видео». Вертикальное, до минуты, в MP4.',
    href: '/admin/collections/projects',
    go: 'Проекты домов',
  },
  {
    title: 'Заявки',
    text: 'В каждой видно, с какого дома и посёлка она пришла и откуда человек: реклама, поиск или напрямую. Меняйте статус по ходу работы.',
    href: '/admin/collections/leads',
    go: 'Открыть заявки',
  },
]

export function Guide() {
  return (
    <section style={{ marginBottom: 'calc(var(--base) * 2)' }}>
      <h2 style={{ margin: '0 0 calc(var(--base) * 0.75)' }}>Как вести сайт</h2>
      <div
        style={{
          display: 'grid',
          gap: 'calc(var(--base) * 0.75)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', // five in a row on a laptop
        }}
      >
        {STEPS.map((s, i) => (
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
