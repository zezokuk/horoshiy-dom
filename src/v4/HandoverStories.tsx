import './handoverStories.css'

const CASES = [
  {
    tag: 'Готовые улицы · Динская и Юг',
    title: 'КП «Южный ветер» и «Калина» полностью проданы и заселены',
    text: 'Кирпичные фасады в едином стиле, бетонные проезды, закрытые заборы и действующие коммуникации — можно приехать и посмотреть, как выглядят обжитые посёлки через годы.',
    fact: '200+ домов построено с 2014 года',
    image: '/v4/houses/yuzhnyy-veter-real.webp',
    alt: 'Реальная улица с готовыми кирпичными домами в посёлке Южный ветер',
    href: '/v4/poselok/yuzhnyy-veter',
    cta: 'Посмотреть посёлок',
  },
  {
    tag: 'Сценарий переезда · от 8,3 млн ₽',
    title: 'Из городской квартиры в свой дом по семейной ипотеке 6%',
    text: 'Готовый кирпичный дом 94–105 м² на участке 4–6 соток ИЖС с платежом от ~36 тыс. ₽/мес — сразу с воротами, калиткой и парковкой у крыльца.',
    fact: 'Семейная ипотека 6% · мат. капитал в первый взнос',
    image: '/v4/houses/tip5-clean.webp',
    alt: 'Готовый кирпичный дом с брусчаткой, угловым окном и озеленением',
    href: '/v4/ipoteka',
    cta: 'Рассчитать платёж',
  },
  {
    tag: 'Качество сдачи · White Box',
    title: 'Ключи в предчистовой отделке без долгостроя и скрытых смет',
    text: 'В цену входят полусухая стяжка, гипсовая штукатурка под обои, тёплые полы, газовый котёл, разводка электрики и воды — можно сразу заходить в чистовой ремонт.',
    fact: 'Гарантия 5 лет · собственная земля ИЖС',
    image: '/v4/houses/vtoroy-svet.webp',
    alt: 'Визуализация дома со вторым светом и вечерним освещением',
    href: '/v4/doma?view=houses',
    cta: 'Выбрать готовый дом',
  },
] as const

export function HandoverStories() {
  return (
    <section className="v3-sec v4-sec v4-handover" id="sdano" aria-labelledby="v4-handover-title">
      <div className="v3-wrap">
        <div className="v4-head v4-head--split">
          <div>
            <p className="v4-num">Факты и передача ключей</p>
            <h2 id="v4-handover-title" className="v3-h2" data-move="lines">
              Уже <em>построено</em> · 200+ домов
            </h2>
          </div>
          <p className="v3-lead">
            Посёлки с готовыми дорогами и соседями: показываем не только текущие дома в продаже, но и реально заселённые улицы с 2014 года.
          </p>
        </div>

        <div className="v4-handover__grid">
          {CASES.map((item) => (
            <article key={item.title} className="v4-handover__card" data-move="up">
              <div className="v4-handover__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.alt} loading="lazy" width="1280" height="800" />
                <span className="v4-handover__tag">{item.tag}</span>
              </div>
              <div className="v4-handover__body">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="v4-handover__foot">
                  <span>{item.fact}</span>
                  <a href={item.href}>{item.cta} →</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
