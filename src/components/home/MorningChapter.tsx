/**
 * Home v2, right under the sunrise (03.11, lore «Один день», 40-…): chapter I. The epigraph says what the screen above has
 * just shown — the sun has risen — then the dream line, then the morning itself: breakfast outdoors on an ordinary
 * Tuesday, what you hear at seven and what you don't. Not a resort for a week, as on ERA, but every day.
 * Fet's lines are from memory: check them against an edition before the client sees the page (40-…, «Цитаты: статус»).
 */
export function MorningChapter() {
  return (
    <section className="section v2-sec v2-morning" id="morning" aria-labelledby="morning-title">
      {/* maple leaves over the corner, swaying a little, as if the breakfast table stood under a tree (Weave, 03.11) */}
      <img className="v2-morning__leaves" src="/design/branches.webp" alt="" aria-hidden decoding="async" />
      <div className="container">
        <header className="v2-morning__head" data-reveal>
          <p className="v2-morning__chapter">
            <span>I</span> Дом
          </p>
          <blockquote className="v2-morning__epigraph">
            <p>
              Я пришёл к тебе с приветом,
              <br />
              Рассказать, что солнце встало,
              <br />
              Что оно горячим светом
              <br />
              По листам затрепетало…
            </p>
            <cite>Афанасий Фет, 1843</cite>
          </blockquote>
          <p className="v2-morning__dream">
            Каждый дом сначала живёт в облаках: в разговорах на кухне, в картинке, которую видишь, закрыв глаза. Мы строим
            так, чтобы однажды утром он оказался настоящим.
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
            <figcaption>Обычный вторник, 7:40</figcaption>
          </figure>
          <div className="v2-morning__words">
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
      </div>
    </section>
  )
}
