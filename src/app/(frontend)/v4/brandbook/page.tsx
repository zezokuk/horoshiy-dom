import type { Metadata } from 'next'
import { getCompany } from '@/lib/data'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import { V4Motion } from '@/v4/V4Motion'
import '@/v3/v3.css'
import '@/v4/v4.css'
import '@/v4/catalogV4.css'
import '@/v4/brandbook.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Брендбук, JTBD и CJM — СК «Хороший дом» (v5.1)' },
  description: 'Визуальная система, позиционирование, сегменты покупателей (JTBD), карта пути клиента (CJM) и продуктовые метрики СК «Хороший дом».',
  robots: { index: false, follow: false },
}

const PALETTE = [
  { hex: '#FAF9F5', name: 'Бумага', role: 'Основной светлый фон страниц и карточек, даёт ощущение воздуха и спокойствия.', darkText: true },
  { hex: '#F2EFE6', name: 'Известняк', role: 'Мягкая подложка вторичных секций, блоков ипотеки, планировок и форм.', darkText: true },
  { hex: '#1B3A24', name: 'Хвойный лес', role: 'Главный акцентный цвет: заголовки, кнопки действия, активные фильтры и подвал.', darkText: false },
  { hex: '#2E6B45', name: 'Живой лист', role: 'Вторичный акцент: курсивные выделения, состояния наведения, свободные участки.', darkText: false },
  { hex: '#A5482D', name: 'Баварский кирпич', role: 'Тёплый маркер архитектуры и фактуры фасадов: забронированные статусы и акценты.', darkText: false },
  { hex: '#17221B', name: 'Графит', role: 'Основной цвет наборного текста и характеристик, высокая контрастность на светлом.', darkText: false },
] as const

const JTBD_SEGMENTS = [
  {
    n: '01',
    title: 'Семья с детьми под семейную ипотеку 6%',
    text: 'Ищут готовый дом 90–120 м² от 8,3 млн ₽ со школой, садиком и асфальтом рядом, чтобы сразу просчитать ежемесячный платёж без скрытых доплат.',
  },
  {
    n: '02',
    title: 'Переезд из квартиры ради своего двора',
    text: 'Хотят уйти от парковки во дворе и тесноты: нужен закрытый участок с воротами, 2–3 спальнями, кухней-гостиной и выходом на террасу.',
  },
  {
    n: '03',
    title: 'Переезд на Юг в готовый жилой посёлок',
    text: 'Присматриваются к Динской и Новой Адыгее: важен газ, проверенные кирпичные соседи, транспортная доступность к Краснодару и быстрая сделка.',
  },
  {
    n: '04',
    title: 'Покупка готового дома вместо стройки с нуля',
    text: 'Опасаются роста смет и затяжных строек: выбирают построенный дом на собственной земле застройщика, в предчистовой отделке White Box и с гарантией 5 лет.',
  },
] as const

const CJM_STEPS = [
  {
    step: '01',
    stage: 'Первый экран · Доверие с первых секунд',
    ui: 'Живой рассвет на баварском кирпичном доме с калиткой и воротами, звёздное небо и чёткий входной порог «от 8,3 млн ₽» + кнопка «Выбрать дом».',
    goal: 'Снять ощущение стоковости, сразу показать реальную архитектуру посёлков и дать понятный старт по бюджету.',
  },
  {
    step: '02',
    stage: 'Слайдер домов в продаже',
    ui: 'Сортировка по возрастанию от 8,3 млн ₽, фильтр по этажности (1 этаж / С мансардой / 2 этажа) и переключатель «Фасад / Вид / План» внутри карточки.',
    goal: 'Удержать внимание первых 20 секунд: покупатель сразу видит доступный дом и планировку до перехода в каталог.',
  },
  {
    step: '03',
    stage: 'Прогулка «За порогом»',
    ui: 'Полноэкранный маршрут по дому «Тип 5» с честной пометкой White Box и живой мини-картой планировки, показывающей точку и направление камеры.',
    goal: 'Помочь человеку «примерить» размер комнат (прихожая, кухня-гостиная, терраса) и перейти к детальному дому.',
  },
  {
    step: '04',
    stage: 'Сценарии жизни + карта посёлков в 1 клик',
    ui: '4 истории загородного ритма, а затем карта Яндекс с прямым кликом на посёлок → зум с инфо-карточкой инфраструктуры и ценой.',
    goal: 'Показать реальное окружение (школы, транспорт, газ) и убрать лишние переключения между картой и списком.',
  },
  {
    step: '05',
    stage: 'Карточка дома и генплан посёлка',
    ui: 'Все 36 участков Динской с зумом на телефоне, 3D-макет и поэтажные планы, переключение «День / Вечер / Ночь», честные подписи кадров.',
    goal: 'Сформировать выбор конкретного участка или планировки перед звонком в отдел продаж.',
  },
  {
    step: '06',
    stage: 'Ипотека и запись на показ',
    ui: '5 программ госпрограмм, калькулятор на /v4/ipoteka, ненавязчивый квиз «Подобрать дом» и единая форма записи с подтверждённым согласием.',
    goal: 'Перевести тёплого покупателя в заявку на просмотр дома в удобное время.',
  },
] as const

const METRICS = [
  { event: 'v4_hero_cta', title: 'Переход с первого экрана', desc: 'Доля посетителей, нажавших «Выбрать дом» или проскролливших к слайдеру.' },
  { event: 'fh_plan_view', title: 'Просмотр планировок в слайдере', desc: 'Переключения «Фасад / Вид / План» и фильтрация по этажности до перехода в карточку.' },
  { event: 'v4_walk_seek', title: 'Вовлечение в прогулку и мини-карту', desc: 'Клики по главам и комнатам на мини-карте планировки в блоке «За порогом».' },
  { event: 'v4_map_estate', title: 'Выбор посёлка на карте', desc: 'Клик по пину посёлка → изучение свободных домов и переход в генплан.' },
  { event: 'v4_quiz_step', title: 'Прохождение подбора дома', desc: 'Заполнение 3 шагов виджета «Подобрать дом» (спальни → оплата → контакт).' },
  { event: 'v4_lead_submit', title: 'Запись на показ и подборку', desc: 'Отправленные заявки со всех форм с привязкой к посёлку, дому и источнику трафика.' },
] as const

export default async function V4Brandbook() {
  const company = await getCompany()

  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <V4Motion />
        <V4PageHead
          eyebrow="Брендбук и продуктовая архитектура · v5.1"
          ghost="5.1"
          title="Система бренда"
          em="«Хороший дом»"
          lead="Актуальное позиционирование, визуальный язык, портреты покупателей (JTBD), карта пути клиента (CJM) и система продуктовых метрик для новой версии сайта."
        />

        <section className="v3-sec v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">01 · Палитра</p>
              <h2 className="v3-h2" data-move="lines">Цвета <em>Юга и кирпича</em></h2>
            </div>
            <p className="v3-lead">Тёплая природная основа без кричащих плашек: светлая бумага подчёркивает цвет баварского кирпича и зелень дворов.</p>
          </div>
          <div className="v3-wrap v4-bb-grid" style={{ marginTop: 24 }}>
            {PALETTE.map((c) => (
              <article key={c.hex} className="v4-bb-swatch" data-move="up">
                <div
                  className="v4-bb-swatch__color"
                  style={{ background: c.hex, color: c.darkText ? '#17221B' : '#FFFAF0' }}
                >
                  <span>{c.hex}</span>
                </div>
                <div className="v4-bb-swatch__body">
                  <b>{c.name}</b>
                  <span>{c.role}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="v3-sec v3-sec--linen v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">02 · Типографика и визуальные правила</p>
              <h2 className="v3-h2" data-move="lines">Шрифты <em>и честность кадров</em></h2>
            </div>
            <p className="v3-lead">Эмоциональная антиква для живых заголовков и строгий гротеск с ровными табличными цифрами для цен и метров.</p>
          </div>
          <div className="v3-wrap v4-bb-type" style={{ marginTop: 24 }}>
            <article className="v4-bb-type__card" data-move="up">
              <span className="v4-bb-cjm__label">Эмоциональные заголовки · Cormorant (500 + Italic)</span>
              <div className="v4-bb-type__sample--emo">Готовый дом <em>в Динской</em></div>
              <p>Используется для главного экрана, названий секций и смысловых акцентов курсивом. Создаёт ощущение обжитого частного дома, а не потокового прайса.</p>
            </article>
            <article className="v4-bb-type__card" data-move="up">
              <span className="v4-bb-cjm__label">Интерфейс, цены и планировки · Onest (400–600)</span>
              <div className="v4-bb-type__sample--ui">от 8 300 000 ₽ · 102,4 м² · 6%</div>
              <p>Отвечает за навигацию, фильтры, характеристики домов, ипотечные расчёты и подписи кадров («Реальное фото» или «Визуализация · отделка White Box»).</p>
            </article>
          </div>
        </section>

        <section className="v3-sec v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">03 · Сегменты (JTBD)</p>
              <h2 className="v3-h2" data-move="lines">Для кого <em>мы строим</em></h2>
            </div>
            <p className="v3-lead">Четыре ключевых сценария покупки, под которые выстроены порядок лотов, фильтры и подсказки на сайте.</p>
          </div>
          <ul className="v3-wrap v4-values v4-values--stagger" style={{ marginTop: 24 }}>
            {JTBD_SEGMENTS.map((seg) => (
              <li key={seg.n} data-move="up">
                <span>{seg.n}</span>
                <b>{seg.title}</b>
                <p>{seg.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="v3-sec v3-sec--mist v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">04 · Карта пути клиента (CJM v5.1)</p>
              <h2 className="v3-h2" data-move="lines">Путь покупателя <em>по экранам</em></h2>
            </div>
            <p className="v3-lead">Актуальная структура от первого касания до записи на показ, собранная с учётом обратной связи по версии v5.</p>
          </div>
          <div className="v3-wrap v4-bb-cjm" style={{ marginTop: 24 }}>
            {CJM_STEPS.map((row) => (
              <article key={row.step} className="v4-bb-cjm__row" data-move="up">
                <div className="v4-bb-cjm__num">{row.step}</div>
                <div>
                  <h3>{row.stage}</h3>
                </div>
                <div>
                  <span className="v4-bb-cjm__label">Что видит покупатель</span>
                  <p>{row.ui}</p>
                </div>
                <div>
                  <span className="v4-bb-cjm__label">Продуктовая задача</span>
                  <p>{row.goal}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="v3-sec v4-sec">
          <div className="v3-wrap v4-head v4-head--split">
            <div>
              <p className="v4-num">05 · Аналитика и метрики</p>
              <h2 className="v3-h2" data-move="lines">Что измеряем <em>на запуске</em></h2>
            </div>
            <p className="v3-lead">События Яндекс.Метрики позволяют видеть не только заявки, но и где именно покупатели выбирают планировки и посёлки.</p>
          </div>
          <div className="v3-wrap v4-bb-metrics" style={{ marginTop: 24 }}>
            {METRICS.map((m) => (
              <article key={m.event} className="v4-bb-metric" data-move="up">
                <code>{m.event}</code>
                <b>{m.title}</b>
                <span>{m.desc}</span>
              </article>
            ))}
          </div>
        </section>

        <V4Final
          company={company}
          context="Брендбук v5.1: обсудить обновление"
          title="Посмотрите"
          em="живой сайт"
          lead="Перейдите на главную страницу v5.1 или откройте раздел «О компании», чтобы проверить обновление целиком."
        />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
