/**
 * Home v2, right under the sunrise (03.11, lore «Один день», 40-…): chapter I. The first screen was the dream (the night,
 * the star, the crescent lowering the roof); here it lands in plain words — the dream is yours, brick and papers are ours —
 * then the morning itself: breakfast outdoors on an ordinary Tuesday, what you hear at seven and what you don't. Not a
 * resort for a week, as on ERA, but every day. The Saint-Exupéry line is our own translation of the French original
 * (Nora Gal's Russian text is still under copyright): «…il faut faire soigneusement la toilette de la planète».
 */
export function MorningChapter() {
  return (
    <section className="section v2-sec v2-morning" id="morning" aria-labelledby="morning-title">
      {/* maple leaves over the corner, swaying a little, as if the breakfast table stood under a tree (Weave, 03.11) */}
      <img className="v2-morning__leaves" src="/design/branches.webp" alt="" aria-hidden decoding="async" />
      <div className="container">
        <header className="v2-morning__head" data-reveal>
          {/* the site is the book «Хороший дом» (Igor, 03.11): a chapter heading, a drop cap, a fleuron, a page number */}
          <p className="v2-morning__chapter">
            <span>I</span> Глава первая · Дом
          </p>
          {/* the fairy tale stays in the picture of the first screen; the words are plain (Ilya, 03.11: «мы же в реальной жизни») */}
          <p className="v2-morning__dream">
            Сначала дом — это мечта: окна на восход, яблоня у крыльца, своя комната для детей. С 2014 года мы строим её в
            кирпиче под Краснодаром.
          </p>
          <p className="v2-morning__moral">Мечта — ваша. Кирпич, крыша и документы — наши.</p>
          <p className="v2-morning__fleuron" aria-hidden>
            ❦
          </p>
        </header>

        <div className="v2-morning__scene" data-reveal>
          <figure className="v2-morning__photo">
            <img
              src="/design/morning-breakfast.webp"
              alt="Завтрак на воздухе у кирпичного дома: кофе, абрикосы, хлеб и полевые цветы, рядом газон и молодые деревья"
              loading="lazy"
              decoding="async"
            />
            {/* steam over the two cups (their places on this picture), rising and thinning, over and over */}
            <span className="v2-steam" style={{ left: '47.5%', top: '60%' }} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="v2-steam" style={{ left: '55%', top: '55%' }} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <figcaption>Обычный вторник, 7:40</figcaption>
          </figure>
          <div className="v2-morning__words">
            <blockquote className="v2-morning__quote">
              <p>Умылся поутру — приведи в порядок и свою планету.</p>
              <cite>Антуан де Сент-Экзюпери, «Маленький принц»</cite>
            </blockquote>
            <h2 className="title title--lg" id="morning-title">
              Сюда не приезжают отдыхать. <em>Здесь живут.</em>
            </h2>
            <p className="lead">
              Не отпуск на неделю, а каждое утро: кофе на воздухе, роса на траве — и 15–40 минут до города, когда захочется.
            </p>
            <div className="v2-morning__ears">
              <div>
                <p className="v2-morning__label">В семь утра слышно</p>
                <ul>
                  <li>птиц на крыше</li>
                  <li>как закипает чайник</li>
                  <li>поливалку через участок</li>
                  <li>тишину</li>
                </ul>
              </div>
              <div>
                <p className="v2-morning__label">И не слышно</p>
                <ul>
                  <li>лифта и соседей сверху</li>
                  <li>сигналов во дворе</li>
                  <li>перфоратора за стеной</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <p className="v2-morning__page" aria-hidden>
          — 1 —
        </p>
      </div>
    </section>
  )
}
