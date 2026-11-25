// Актуальные фотографии и визуализации проектов СК «Хороший дом» без наклеек, строймусора и дублей.
export type HouseFrame = {
  src: string
  alt: string
  caption: string
  plan?: boolean
}

const interiorFrames: HouseFrame[] = [
  {
    src: '/v4/img/in-kitchen.webp',
    alt: 'Пример интерьера просторной кухни-гостиной с панорамным выходом во двор',
    caption: 'Пример интерьера · кухня-гостиная (дом сдаётся в White Box)',
  },
  {
    src: '/v4/img/in-terrace.webp',
    alt: 'Пример оформления крытой террасы и зоны отдыха за домом',
    caption: 'Пример интерьера · выход на террасу (отделка White Box)',
  },
]

const type1: HouseFrame[] = [
  { src: '/v4/houses/tip1-clean.webp', alt: 'Готовый одноэтажный кирпичный дом «Тип 1 (В2)» с забором и воротами', caption: 'Главный фасад · Проект «Тип 1 (В2)»' },
  { src: '/v4/img/slide-tip-1.webp', alt: 'Кирпичный дом «Тип 1» с участком и подъездом', caption: 'Общий вид · Проект «Тип 1 (В2)»' },
  ...interiorFrames,
]

const type2: HouseFrame[] = [
  { src: '/v4/img/slide-tip-2.webp', alt: 'Кирпичный дом «Тип 2» с мансардным окном, воротами и благоустроенным двором', caption: 'Визуализация · Проект «Тип 2»' },
  ...interiorFrames,
]

const type3: HouseFrame[] = [
  { src: '/v4/img/slide-tip-3.webp', alt: 'Кирпичный дом «Тип 3» с баварской кладкой и ухоженным двором', caption: 'Визуализация · Проект «Тип 3»' },
  ...interiorFrames,
]

const type5: HouseFrame[] = [
  { src: '/v4/houses/tip5-clean.webp', alt: 'Готовый кирпичный дом «Тип 5» с угловым окном, мансардой и брусчаткой', caption: 'Реальное фото · Дом по проекту «Тип 5»' },
  { src: '/v4/houses/type5-front.webp', alt: 'Главный фасад кирпичного дома с крытым крыльцом', caption: 'Главный фасад · Дом по проекту «Тип 5»' },
  { src: '/v4/houses/type5-entry.webp', alt: 'Крыльцо и кирпичная кладка со стороны калитки', caption: 'Вход и двор · Дом по проекту «Тип 5»' },
  ...interiorFrames,
]

const type6: HouseFrame[] = [
  { src: '/v4/houses/tip6-clean.webp', alt: 'Кирпичный фасад «Тип 6» с панорамными окнами в пол и крытым крыльцом', caption: 'Реальное фото · Проект «Тип 6»' },
  { src: '/v4/houses/type6v3-front.webp', alt: 'Одноэтажный кирпичный фасад с мансардным окном', caption: 'Фасад · Проект «Тип 6 (В3)»' },
  ...interiorFrames,
]

const type10: HouseFrame[] = [
  { src: '/v4/houses/tip10-clean.webp', alt: 'Двухэтажный кирпичный дом «Тип 10» с кованым балконом и забором', caption: 'Реальное фото · Проект «Тип 10»' },
  { src: '/v4/houses/type10-front.webp', alt: 'Два двухэтажных кирпичных дома на Дружбы', caption: 'Общий вид · Проект «Тип 10»' },
  { src: '/v4/houses/type10-side.webp', alt: 'Двухэтажный кирпичный дом со стороны улицы', caption: 'Вид с улицы · Дом по проекту «Тип 10»' },
  ...interiorFrames,
]

const type12: HouseFrame[] = [
  { src: '/v4/houses/vtoroy-svet.webp', alt: 'Проект со «вторым светом» и высоким панорамным остеклением вечером', caption: 'Визуализация проекта · дом со «вторым светом» (White Box)' },
  { src: '/v4/houses/vtoroy-svet-day.webp', alt: 'Проект со «вторым светом» и панорамным остеклением днём', caption: 'Визуализация проекта · дневной вид (White Box)' },
  ...interiorFrames,
]

const photosByCode: Record<string, HouseFrame[]> = {
  'di-tip1-v2': type1,
  'di-tam-6-tip1-v2': type1,
  'di-26-tip2-v3': type2,
  'di-tip2-v4': type2,
  'di-tip2-v5': type2,
  'di-22-tip2-v4': type2,
  'kr-tip3': type3,
  'di-tip5': type5,
  'di-tip5-v3': type5,
  'di-18-tip5-v3': type5,
  'di-300-2-tip5-v4': type5,
  'di-tam-5-tip5-v4': type5,
  'di-tip6-v3': type6,
  'di-25-tip6-v3': type6,
  'di-tam-1-tip6': type6,
  'di-tip6-v2': type6,
  'dr-tip10': type10,
  'di-tip12': type12,
  'di-tam-3-tip12': type12,
  'di-300-1-tip12': type12,
}

const photosBySlug: Record<string, HouseFrame[]> = {
  'tip-1': type1,
  'tip-2': type2,
  'tip-3': type3,
  'tip-5': type5,
  'tip-5-v3': type5,
  'tip-6': type6,
  'tip-6-v3': type6,
  'tip-10': type10,
  'tip-12': type12,
}

export function housePhotography(code: string, projectSlug?: string | null): readonly HouseFrame[] {
  return photosByCode[code] ?? (projectSlug ? photosBySlug[projectSlug] : undefined) ?? []
}

export function projectCleanPhoto(slug?: string | null): string | undefined {
  if (!slug) return undefined
  return photosBySlug[slug]?.[0]?.src
}

export function fallbackHouseFrames(typeName: string, primaryPhoto?: string | null, extraPhoto?: string | null): HouseFrame[] {
  const list: HouseFrame[] = []
  const pushUnique = (frame: HouseFrame) => {
    if (!list.some((x) => x.src === frame.src)) list.push(frame)
  }
  if (extraPhoto) pushUnique({ src: extraPhoto, alt: `Фасад дома по проекту «${typeName}»`, caption: `Главный фасад · Проект «${typeName}»` })
  if (primaryPhoto) pushUnique({ src: primaryPhoto, alt: `Фотография проекта «${typeName}»`, caption: `Изображение проекта «${typeName}»` })
  interiorFrames.forEach(pushUnique)
  return list
}
