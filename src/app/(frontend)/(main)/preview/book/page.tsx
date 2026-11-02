import type { Metadata } from 'next'
import { BookFlip, type BookLeaf } from '@/components/home/BookFlip'
import { mainHref } from '@/lib/site'

// a design prototype for Igor and Ilya (03.11): never in search, never the canonical home
export const metadata: Metadata = {
  title: 'Книга «Хороший дом» — черновик',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
}

const picture = (src: string, alt: string, chapter: string) => (
  <figure className="bk-pic">
    <img src={src} alt={alt} loading="lazy" decoding="async" />
    <figcaption>{chapter}</figcaption>
  </figure>
)

const text = (chapter: string, body: string, page: number) => (
  <div className="bk-text">
    <p className="bk-text__chapter">{chapter}</p>
    <p className="bk-text__body">{body}</p>
    <p className="bk-text__page">— {page} —</p>
  </div>
)

// plain words, no fairy tale (Ilya, 03.11); the pictures are the ones already on the site
const LEAVES: BookLeaf[] = [
  {
    front: (
      <div className="bk-cover">
        <p className="bk-cover__series">Книга первая</p>
        <p className="bk-cover__title">Хороший дом</p>
        <p className="bk-cover__sub">о домах, которые начинаются с мечты</p>
        <p className="bk-cover__year">с 2014 года</p>
      </div>
    ),
    back: text('Глава первая · Утро', 'Солнце встаёт над полем, на газоне роса. До города 15–40 минут, но торопиться некуда.', 1),
  },
  {
    front: picture('/design/hero-morning.webp', 'Кирпичный дом ранним утром, солнце сквозь листву', 'I · Утро'),
    back: text('Глава вторая · Завтрак', 'Кофе на воздухе в обычный вторник. Не отпуск на неделю — просто ваше утро.', 3),
  },
  {
    front: picture('/design/morning-breakfast.webp', 'Завтрак на воздухе у кирпичного дома', 'II · Завтрак'),
    back: text('Глава третья · День', 'Дети на газоне с поливалкой и собакой. Свой двор, над которым видно небо.', 5),
  },
  {
    front: picture('/design/scenes/lawn.webp', 'Дети и собака на газоне с поливалкой у дома', 'III · День'),
    back: (
      <div className="bk-text">
        <p className="bk-text__chapter">Глава последняя · Встреча</p>
        <p className="bk-text__body">Остальные главы вы напишете сами. Приезжайте посмотреть дом вживую.</p>
        <a className="btn btn--green" href={mainHref('/catalog')}>
          Выбрать дом
        </a>
      </div>
    ),
  },
]

/** /preview/book: the turning book on its own, to decide where it goes on the site (КНИГА-И-МЕЧТА-для-Игоря.md). */
export default function BookPreview() {
  return (
    <>
      <section className="section v2-sec">
        <div className="container bk-intro">
          <p className="eyebrow">Черновик для Игоря и Ильи</p>
          <h1 className="title title--lg">Книга «Хороший дом»: листайте вниз — страницы перевернутся</h1>
          <p className="lead">Как в начале «Шрека»: закрытая книга открывается, каждая прокрутка — новая страница.</p>
        </div>
      </section>
      <BookFlip
        leaves={LEAVES}
        last={
          <div className="bk-text bk-text--end">
            <p className="bk-text__chapter">Соавторы</p>
            <p className="bk-text__body">Эту книгу пишут вместе с нами семьи, которые построили здесь свой дом.</p>
          </div>
        }
      />
      <section className="section v2-sec">
        <div className="container bk-intro">
          <p className="lead">Конец черновика. Дальше на главной была бы следующая глава.</p>
        </div>
      </section>
    </>
  )
}
