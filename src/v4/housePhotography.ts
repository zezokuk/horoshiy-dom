// Sources in the client's «СайтИнфо» folder. Presentation slides 16420342, 16420350 and
// 12050715 identify the respective projects. The photographs do not identify a cadastral plot.
export type HouseFrame = {
  src: string
  alt: string
  caption: string
}

const type5: HouseFrame[] = [
  { src: '/v4/houses/type5-front.webp', alt: 'Главный фасад кирпичного дома с крытым крыльцом', caption: 'Главный фасад · Дом по проекту «Тип 5»' },
  { src: '/v4/houses/type5-side.webp', alt: 'Боковой фасад с высоким окном и входом под навесом', caption: 'Боковой фасад · Дом по проекту «Тип 5»' },
  { src: '/v4/houses/type5-entry.webp', alt: 'Крыльцо и кирпичная кладка со стороны калитки', caption: 'Вход со двора · Дом по проекту «Тип 5»' },
]

const photosByCode: Record<string, HouseFrame[]> = {
  // DSC_6531, DSC_6536, DSC_6533. Two variants reuse the same facade on the client's slides.
  'di-tip5': type5,
  'di-tip5-v3': type5,
  'di-18-tip5-v3': type5,
  'di-tip6-v3': [
    { src: '/v4/houses/type6v3-front.webp', alt: 'Одноэтажный кирпичный фасад с мансардным окном', caption: 'Визуализация проекта «Тип 6 (В3)»' },
  ],
  'dr-tip10': [
    { src: '/v4/houses/type10-front.webp', alt: 'Два двухэтажных кирпичных дома на Дружбы', caption: 'Общий вид · Проект «Тип 10»' },
    { src: '/v4/houses/type10-entry.webp', alt: 'Главный вход и окна второго этажа', caption: 'Главный фасад · Дом по проекту «Тип 10»' },
    { src: '/v4/houses/type10-side.webp', alt: 'Двухэтажный кирпичный дом со стороны улицы', caption: 'Вид с улицы · Дом по проекту «Тип 10»' },
  ],
}

export function housePhotography(code: string): readonly HouseFrame[] {
  return photosByCode[code] ?? []
}
