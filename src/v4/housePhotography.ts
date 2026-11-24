// Sources in the client's «СайтИнфо» folder. Presentation slides 16420342, 16420350 and
// 12050715 identify the respective projects. The photographs do not identify a cadastral plot.
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

const type5: HouseFrame[] = [
  { src: '/v4/houses/type5-front.webp', alt: 'Главный фасад кирпичного дома с крытым крыльцом', caption: 'Главный фасад · Дом по проекту «Тип 5»' },
  { src: '/v4/houses/type5-side.webp', alt: 'Боковой фасад с высоким окном и входом под навесом', caption: 'Боковой фасад · Вид со двора и кладка' },
  { src: '/v4/houses/type5-entry.webp', alt: 'Крыльцо и кирпичная кладка со стороны калитки', caption: 'Входная группа · Крыльцо и калитка' },
  { src: '/v4/img/in-porch.webp', alt: 'Подход к дому, благоустроенная дорожка и участок', caption: 'Участок и подход · Благоустроенный двор' },
  { src: '/v4/img/in-hall.webp', alt: 'Пример интерьера светлой прихожей с выходом в гостиную', caption: 'Пример интерьера · Прихожая (дом сдаётся в White Box)' },
  ...interiorFrames,
]

const type6v3: HouseFrame[] = [
  { src: '/v4/houses/type6v3-front.webp', alt: 'Одноэтажный кирпичный фасад с мансардным окном', caption: 'Главный фасад · Проект «Тип 6 (В3)»' },
  { src: '/v4/houses/type5-side.webp', alt: 'Вид сбоку на кирпичную кладку и участок', caption: 'Объём дома · серия одноэтажных проектов' },
  ...interiorFrames,
]

const photosByCode: Record<string, HouseFrame[]> = {
  // DSC_6531, DSC_6536, DSC_6533. Two variants reuse the same facade on the client's slides.
  'di-tip5': type5,
  'di-tip5-v3': type5,
  'di-18-tip5-v3': type5,
  'di-tip6-v3': type6v3,
  'dr-tip10': [
    { src: '/v4/houses/type10-front.webp', alt: 'Два двухэтажных кирпичных дома на Дружбы', caption: 'Общий вид · Проект «Тип 10»' },
    { src: '/v4/houses/type10-entry.webp', alt: 'Главный вход и окна второго этажа', caption: 'Главный фасад · Дом по проекту «Тип 10»' },
    { src: '/v4/houses/type10-side.webp', alt: 'Двухэтажный кирпичный дом со стороны улицы', caption: 'Вид с улицы · Дом по проекту «Тип 10»' },
    ...interiorFrames,
  ],
}

export function housePhotography(code: string, projectSlug?: string | null): readonly HouseFrame[] {
  if (photosByCode[code]) return photosByCode[code]
  if (projectSlug?.startsWith('tip-5') || /tip5/i.test(code)) return type5
  if (projectSlug?.startsWith('tip-6') || /tip6/i.test(code)) return type6v3
  return []
}

export function fallbackHouseFrames(typeName: string, primaryPhoto?: string | null, extraPhoto?: string | null): HouseFrame[] {
  const list: HouseFrame[] = []
  const pushUnique = (frame: HouseFrame) => {
    if (!list.some((x) => x.src === frame.src)) list.push(frame)
  }
  if (extraPhoto) pushUnique({ src: extraPhoto, alt: `Фасад дома по проекту «${typeName}»`, caption: `Главный фасад · Проект «${typeName}»` })
  if (primaryPhoto) pushUnique({ src: primaryPhoto, alt: `Фотография проекта «${typeName}»`, caption: `Изображение проекта «${typeName}»` })
  if (list.length < 2) {
    pushUnique({ src: '/v4/houses/type5-side.webp', alt: 'Кирпичная кладка и участок вокруг дома', caption: `Архитектура · «${typeName}»` })
  }
  interiorFrames.forEach(pushUnique)
  return list
}
