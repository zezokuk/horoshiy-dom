// The seed's data: a copy of the demo site's site/lib/data.ts (09.10), from the client's presentation
// (horoshiydom.tb.ru, Oct 2026). Since 23.10 this copy is the one to edit: texts the client never wrote are put
// in the client's own words («возможность подключить газ», «гарантия 5 лет на капитальные дефекты»).

export type Status = "free" | "reserved" | "sold";

export type Nearby = { label: string; time: string };

export type Estate = {
  slug: string;
  name: string;
  kind: string;
  place: string;
  region: string;
  address: string;
  coords: [number, number];
  homes: number;
  tagline: string;
  description: string;
  nearby: Nearby[];
  infrastructure: string[];
  utilities: string[];
  streets?: string[];
  extras?: string[];
  genplan: { rows: number[]; road: "between" | "below"; commercial?: number };
};

export type HouseType = {
  code: string;
  bedrooms: number;
  bathrooms: number;
  features: string[];
};

export type Unit = {
  id: string;
  estate: string;
  type: string;
  area: number;
  mansard?: number;
  plot: string;
  price: number;
  status: Status;
  image: string;
  note?: string;
};

export const COMPANY = {
  name: "Хороший дом",
  legal: "Строительная компания «Хороший дом»",
  since: 2014,
  phone: "+7 (965) 414-93-93",
  phoneHref: "tel:+79654149393",
  email: "dom_khoroshiy@mail.ru",
  address: "аул Козет, ул. Хеттская, 1",
  region: "Тахтамукайский район, Республика Адыгея",
  hours: "Ежедневно 10:00–19:00",
  telegram: "https://t.me/+7A4wtTz7D9gyNjgy",
  officeCoords: [44.988087, 38.990629] as [number, number],
  slogan: "Сюда приводят мечты",
};

export const ADVANTAGES = [
  { title: "Дом за 6 месяцев", text: "Построим капитальный дом под ключ или продадим готовый. Ипотеку и регистрацию оформим за 2 недели." },
  { title: "Сертифицированные материалы", text: "Кирпич, кровля и инженерия — только с документами. Никаких «аналогов подешевле»." },
  { title: "Продуманные проекты", text: "12 типовых проектов, в которых каждый метр работает: кухни-гостиные, мастер-спальни, террасы." },
  { title: "Не хуже особняков", text: "Недорогое жильё может выглядеть не хуже особняков — так мы строим каждый дом." },
  { title: "Гарантия 5 лет", text: "Гарантия 5 лет на капитальные дефекты дома." },
  { title: "С 2014 года", text: "Начинали с одного таунхауса, сегодня строим посёлки в Адыгее и Динской." },
];

export const FINISHING = [
  "Разводка электрики: розетки, выключатели, вывод под люстру",
  "Штукатурка по маякам, 1 слой шпаклёвки",
  "Отопление: радиаторы в каждой комнате, котёл газовый или электрический",
  "Двор, парковка на 2 автомобиля, отмостка тротуарной плиткой",
];

export const MORTGAGE_PROGRAMS = [
  { name: "Семейная ипотека", text: "Для семей с детьми — льготная ставка по госпрограмме." },
  { name: "IT-ипотека", text: "Для специалистов аккредитованных IT-компаний." },
  { name: "Военная ипотека", text: "Для участников накопительно-ипотечной системы." },
];

// Value block «Хороший дом — там, где семья»: only facts from the developer's own materials.
export const FAMILY_VALUES = [
  { title: "Школа и сад рядом", text: "До школы №10 в Козете — 2–5 минут, до школы №19 в Новой Адыгее — 3 минуты." },
  { title: "Свой двор", text: "Участок 4–7 соток, парковка на 2 машины, место для сада, качелей и мангала." },
  { title: "Тихие улицы", text: "Камерные посёлки на 5–34 дома, в «Южном ветре» — своя детская площадка." },
  { title: "Тепло и надёжно", text: "Капитальный кирпичный дом с отоплением, газ можно подключить. Гарантия 5 лет." },
];

export const FAQ = [
  {
    q: "Можно купить дом в ипотеку?",
    a: "Да. Работаем с семейной, IT и военной ипотекой. Поможем подобрать банк и программу, соберём документы — сделку и регистрацию оформляем за 2 недели.",
  },
  {
    q: "В каком состоянии дом при покупке?",
    a: "С предчистовой отделкой: разведена электрика, стены оштукатурены по маякам, стоят радиаторы и котёл, двор и парковка на 2 машины замощены плиткой.",
  },
  {
    q: "Какие коммуникации в доме?",
    a: "Вода (центральная или скважина — зависит от посёлка), электричество 15 кВт и септик. Газ можно подключить.",
  },
  {
    q: "Можно построить дом на своём участке или по своему проекту?",
    a: "Нет: мы строим только в своих посёлках и только по своим типовым проектам. Если в посёлке есть свободная земля, построим на ней дом по одному из наших проектов — возможность и сроки подтвердим после проверки участка.",
  },
  {
    q: "Какая гарантия?",
    a: "5 лет на капитальные дефекты дома.",
  },
  {
    q: "Как посмотреть дом?",
    a: "Оставьте заявку или позвоните — покажем дом вживую в удобное время или проведём показ по видеосвязи, если вы в другом городе.",
  },
];

const KOZET_INFRA = [
  "Школы и детские сады",
  "Кафе и рестораны",
  "Боулинг-клуб",
  "Причал парома до города",
  "Развлекательный детский центр",
  "Салон красоты, парикмахерская",
  "Магазины «Магнит» и «Пятёрочка»",
  "Корты для большого тенниса (строятся)",
  "Набережная от «Онегин парк» (проект)",
];

const ADYGEYA_INFRA = [
  "Кафе и рестораны",
  "Отделение почты",
  "ТРЦ «Мега», «Леруа Мерлен», ТЦ «Метро»",
  "Салон красоты, фитнес-клуб",
  "Магазины «Магнит» и «Пятёрочка»",
  "Школы и детские сады",
];

export const ESTATES: Estate[] = [
  {
    slug: "yuzhnyy-veter",
    name: "Южный ветер",
    kind: "Коттеджный посёлок",
    place: "аул Козет",
    region: "Тахтамукайский район, Адыгея",
    address: "аул Козет, ул. Хеттская",
    coords: [44.987654, 38.990979],
    homes: 34,
    tagline: "Живой посёлок в 20 минутах от «Галереи Краснодар»",
    description:
      "34 дома на трёх улицах и своя детская площадка, все дома проданы. На первой линии будут 3 коммерческих здания. Здесь же наш офис — приезжайте смотреть построенные дома.",
    nearby: [
      { label: "ТРЦ «Галерея Краснодар»", time: "20 мин" },
      { label: "Школа №10", time: "5 мин" },
      { label: "Детский сад", time: "5 мин" },
      { label: "«Пятёрочка»", time: "1 мин" },
      { label: "Паром до города", time: "7 мин" },
    ],
    infrastructure: KOZET_INFRA,
    utilities: ["Газ — можно подключить", "Вода центральная", "Электричество 15 кВт", "Септик 9 м³"],
    streets: ["ул. Умара Берсея", "ул. Хеттская", "ул. Шоры Ногмова"],
    extras: ["Детская площадка", "3 коммерческих здания на первой линии — будут построены"],
    genplan: { rows: [6, 6, 6, 6, 5, 5], road: "between", commercial: 3 },
  },
  {
    slug: "kalina",
    name: "Калина",
    kind: "Проект",
    place: "аул Козет",
    region: "Тахтамукайский район, Адыгея",
    address: "аул Козет, ул. Калинина, 12",
    coords: [44.996612, 39.007724],
    homes: 10,
    tagline: "Тихая улица на 10 домов рядом со школой",
    description: "Камерный проект на одной улице: 10 домов, до школы — 2 минуты пешком.",
    nearby: [
      { label: "Центр Краснодара", time: "25 мин" },
      { label: "Школа №10", time: "2 мин" },
    ],
    infrastructure: KOZET_INFRA,
    utilities: ["Газ — можно подключить", "Вода центральная", "Электричество 15 кВт", "Септик 9 м³"],
    genplan: { rows: [5, 5], road: "between" },
  },
  {
    slug: "krasnaya-39",
    name: "Красная 39",
    kind: "Проект",
    place: "пос. Новая Адыгея",
    region: "Тахтамукайский район, Адыгея",
    address: "пос. Новая Адыгея, ул. Красная, 39",
    coords: [45.021304, 38.934541],
    homes: 5,
    tagline: "Пять домов в 7 минутах от ТЦ «Мега»",
    description: "Небольшой проект для тех, кто хочет жить тихо, но в шаге от городской инфраструктуры.",
    nearby: [
      { label: "ТРЦ «Галерея Краснодар»", time: "15 мин" },
      { label: "Школа №19", time: "3 мин" },
      { label: "ТЦ «Мега»", time: "7 мин" },
    ],
    infrastructure: ADYGEYA_INFRA,
    utilities: ["Газ — можно подключить", "Вода центральная", "Электричество 15 кВт", "Септик 9 м³"],
    genplan: { rows: [5], road: "below" },
  },
  {
    slug: "druzhby-43",
    name: "Дружбы 43",
    kind: "Проект",
    place: "пос. Новая Адыгея",
    region: "Тахтамукайский район, Адыгея",
    address: "пос. Новая Адыгея, ул. Дружбы, 43",
    coords: [45.027951, 38.93044],
    homes: 8,
    tagline: "Двухэтажные дома для большой семьи",
    description: "8 домов, включая двухэтажный проект на 168 м² с четырьмя спальнями.",
    nearby: [
      { label: "ТРЦ «Галерея Краснодар»", time: "15 мин" },
      { label: "ТЦ «Мега»", time: "10 мин" },
    ],
    infrastructure: ADYGEYA_INFRA,
    utilities: ["Газ — можно подключить", "Вода центральная", "Электричество 15 кВт", "Септик 9 м³"],
    genplan: { rows: [4, 4], road: "between" },
  },
  {
    slug: "dinskaya",
    name: "Динская",
    kind: "Проект",
    place: "ст. Динская",
    region: "Краснодарский край",
    address: "ст. Динская, ул. Славянская, 78",
    coords: [45.24112, 39.252861],
    homes: 36, // Александр 13.11
    tagline: "Самый большой выбор домов — у реки на севере станицы",
    description:
      "Северная часть станицы Динской рядом с живописной рекой. Больше всего свободных домов и самые доступные цены.",
    nearby: [{ label: "ТЦ «Красная площадь», Краснодар", time: "40 мин" }],
    infrastructure: [
      "Кафе и рестораны",
      "Развлекательные центры",
      "Парк «Комсомольский»",
      "Пляж с лодочной станцией",
      "Магазины «Магнит» и «Пятёрочка»",
      "Школы и детские сады",
    ],
    utilities: ["Газ — можно подключить", "Вода — индивидуальная скважина", "Электричество 15 кВт", "Септик 9 м³"],
    genplan: { rows: [7, 7], road: "between" },
  },
];

export const HOUSE_TYPES: Record<string, HouseType> = {
  "Тип 1": { code: "Тип 1", bedrooms: 3, bathrooms: 1, features: ["Кухня-гостиная", "Терраса"] },
  "Тип 1 (В2)": { code: "Тип 1 (В2)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Терраса"] },
  "Тип 2": { code: "Тип 2", bedrooms: 2, bathrooms: 1, features: ["Кухня-гостиная"] },
  "Тип 2 (В3)": { code: "Тип 2 (В3)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная"] },
  "Тип 2 (В4)": { code: "Тип 2 (В4)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Кладовая"] },
  "Тип 2 (В5)": { code: "Тип 2 (В5)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Кладовая"] },
  "Тип 3": { code: "Тип 3", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Панорамное остекление"] },
  "Тип 4": { code: "Тип 4", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная"] },
  "Тип 5": { code: "Тип 5", bedrooms: 3, bathrooms: 2, features: ["Мастер-спальня", "Кухня-столовая-гостиная", "Терраса 19 м²", "Угловые окна"] },
  "Тип 5 (В2)": { code: "Тип 5 (В2)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Терраса"] },
  "Тип 5 (В3)": { code: "Тип 5 (В3)", bedrooms: 3, bathrooms: 1, features: ["Кухня-гостиная", "Терраса"] },
  "Тип 5 (В4)": { code: "Тип 5 (В4)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Бойлерная", "Кладовая"] },
  "Тип 6": { code: "Тип 6", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная"] },
  "Тип 6 (В2)": { code: "Тип 6 (В2)", bedrooms: 3, bathrooms: 1, features: ["Кухня-гостиная", "Прихожая"] },
  "Тип 6 (В3)": { code: "Тип 6 (В3)", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Бойлерная-кладовая"] },
  "Тип 7": { code: "Тип 7", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная"] },
  "Тип 8": { code: "Тип 8", bedrooms: 4, bathrooms: 2, features: ["Кухня-гостиная"] },
  "Тип 9": { code: "Тип 9", bedrooms: 3, bathrooms: 2, features: ["Два этажа", "Кухня-гостиная", "Балкон"] },
  "Тип 10": { code: "Тип 10", bedrooms: 4, bathrooms: 2, features: ["Два этажа", "Кухня-гостиная"] },
  "Тип 11": { code: "Тип 11", bedrooms: 3, bathrooms: 1, features: ["Кухня-гостиная", "Терраса"] },
  "Тип 12": { code: "Тип 12", bedrooms: 3, bathrooms: 2, features: ["Кухня-гостиная", "Бойлерная", "Кладовая", "Прихожая"] },
};

// Statuses come from the client's price grid (red cell = sold). Prices follow the house cards.
export const UNITS: Unit[] = [
  { id: "yv-tip1", estate: "yuzhnyy-veter", type: "Тип 1", area: 90, mansard: 55, plot: "3,8–4 сот.", price: 9_500_000, status: "sold", image: "14427918" },
  { id: "yv-tip4", estate: "yuzhnyy-veter", type: "Тип 4", area: 105, mansard: 67, plot: "3,8–4 сот.", price: 10_500_000, status: "sold", image: "14427920" },
  { id: "yv-tip5", estate: "yuzhnyy-veter", type: "Тип 5", area: 105, mansard: 67, plot: "3,8–4 сот.", price: 10_500_000, status: "sold", image: "14427948" },
  { id: "yv-tip5-v2", estate: "yuzhnyy-veter", type: "Тип 5 (В2)", area: 105, mansard: 67, plot: "3,8–4 сот.", price: 10_500_000, status: "sold", image: "14427965" },
  { id: "yv-tip9", estate: "yuzhnyy-veter", type: "Тип 9", area: 145, mansard: 37, plot: "4,2 сот.", price: 12_500_000, status: "free", image: "13055538" },
  { id: "yv-tip2-v3", estate: "yuzhnyy-veter", type: "Тип 2 (В3)", area: 90, mansard: 55, plot: "3,8–4 сот.", price: 10_000_000, status: "free", image: "14427983" },

  { id: "ka-tip1", estate: "kalina", type: "Тип 1", area: 90, mansard: 55, plot: "5 сот.", price: 9_300_000, status: "sold", image: "12042596" },
  { id: "ka-tip2", estate: "kalina", type: "Тип 2", area: 90, mansard: 55, plot: "4,5 сот.", price: 8_800_000, status: "sold", image: "12042798" },
  { id: "ka-tip5-v2-a", estate: "kalina", type: "Тип 5 (В2)", area: 105, mansard: 67, plot: "5 сот.", price: 10_500_000, status: "sold", image: "12042894" },
  { id: "ka-tip5-v2-b", estate: "kalina", type: "Тип 5 (В2)", area: 105, mansard: 67, plot: "7 сот.", price: 11_800_000, status: "sold", image: "12042894" },
  { id: "ka-tip7", estate: "kalina", type: "Тип 7", area: 118, mansard: 76, plot: "6,6 сот.", price: 12_000_000, status: "sold", image: "14903460" },
  { id: "ka-tip6-v2", estate: "kalina", type: "Тип 6 (В2)", area: 110, mansard: 76, plot: "5,1 сот.", price: 11_250_000, status: "sold", image: "14903461" },

  { id: "kr-tip3", estate: "krasnaya-39", type: "Тип 3", area: 105, mansard: 78, plot: "4,4 сот.", price: 15_000_000, status: "free", image: "12050446" },
  { id: "kr-tip5-v2", estate: "krasnaya-39", type: "Тип 5 (В2)", area: 105, mansard: 67, plot: "4,9 сот.", price: 14_500_000, status: "free", image: "12050447" },

  { id: "dr-tip10", estate: "druzhby-43", type: "Тип 10", area: 168, mansard: 48, plot: "4 сот.", price: 17_200_000, status: "free", image: "12050715" },

  { id: "di-tip1", estate: "dinskaya", type: "Тип 1", area: 90, mansard: 55, plot: "4,2–4,4 сот.", price: 8_800_000, status: "sold", image: "16420343" },
  { id: "di-tip5", estate: "dinskaya", type: "Тип 5", area: 110.2, mansard: 55, plot: "4,2–4,4 сот.", price: 9_700_000, status: "free", image: "16420342" },
  { id: "di-tip6", estate: "dinskaya", type: "Тип 6", area: 105, mansard: 67, plot: "4,2–4,4 сот.", price: 9_750_000, status: "sold", image: "16420346" },
  { id: "di-tip2-v3", estate: "dinskaya", type: "Тип 2 (В3)", area: 90, plot: "4,2–4,4 сот.", price: 8_900_000, status: "sold", image: "16420347", note: "В шахматке цена 9 100 000 ₽ — уточнить" },
  { id: "di-tip8", estate: "dinskaya", type: "Тип 8", area: 118, plot: "4,2–4,4 сот.", price: 11_000_000, status: "sold", image: "16420348" },
  { id: "di-tip6-v2", estate: "dinskaya", type: "Тип 6 (В2)", area: 115, mansard: 76, plot: "4,2–4,4 сот.", price: 10_500_000, status: "free", image: "16420349" },
  { id: "di-tip6-v3", estate: "dinskaya", type: "Тип 6 (В3)", area: 93.6, mansard: 55, plot: "4–4,5 сот.", price: 9_300_000, status: "free", image: "16420350" },
  { id: "di-tip11", estate: "dinskaya", type: "Тип 11", area: 94.2, mansard: 55, plot: "4,4 сот.", price: 8_900_000, status: "sold", image: "16420351" },
  { id: "di-tip5-v3", estate: "dinskaya", type: "Тип 5 (В3)", area: 90.8, mansard: 55, plot: "4–4,5 сот.", price: 8_800_000, status: "free", image: "16420352" },
  { id: "di-tip1-v2", estate: "dinskaya", type: "Тип 1 (В2)", area: 94.6, mansard: 55, plot: "4–4,5 сот.", price: 9_000_000, status: "free", image: "16420354" },
  { id: "di-tip2-v5", estate: "dinskaya", type: "Тип 2 (В5)", area: 90, mansard: 55, plot: "4,2–4,4 сот.", price: 9_300_000, status: "free", image: "16420353" },
  { id: "di-tip2-v4", estate: "dinskaya", type: "Тип 2 (В4)", area: 94.8, mansard: 55, plot: "4–4,5 сот.", price: 9_100_000, status: "free", image: "16420355", note: "С мансардой — 9 300 000 ₽" },
  { id: "di-tip5-v4", estate: "dinskaya", type: "Тип 5 (В4)", area: 93.9, mansard: 55, plot: "4–4,5 сот.", price: 9_100_000, status: "free", image: "16420356", note: "В шахматке цена 9 000 000 ₽ — уточнить" },
  { id: "di-tip12", estate: "dinskaya", type: "Тип 12", area: 85, plot: "4 сот.", price: 9_000_000, status: "free", image: "16420357" },
];

/* ---------- helpers ---------- */

export const STATUS_LABEL: Record<Status, string> = { free: "Свободен", reserved: "Бронь", sold: "Продан" };

export const getEstate = (slug: string) => ESTATES.find((e) => e.slug === slug);
export const getUnit = (id: string) => UNITS.find((u) => u.id === id);
export const unitsOf = (slug: string) => UNITS.filter((u) => u.estate === slug);
export const freeUnits = () => UNITS.filter((u) => u.status === "free");

export const priceFrom = (slug: string) => {
  const free = unitsOf(slug).filter((u) => u.status === "free");
  const pool = free.length ? free : unitsOf(slug);
  return Math.min(...pool.map((u) => u.price));
};

export const formatPrice = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
export const formatMillions = (n: number) =>
  `${(n / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} млн ₽`;

export const unitTitle = (u: Unit) =>
  `${u.type} · ${u.area.toLocaleString("ru-RU")} м²${u.mansard ? ` + ${u.mansard} м² мансарда` : ""}`;

export const houseImage = (u: Unit) => `/img/houses/${u.image}.webp`;
export const planImage = (u: Unit) => `/img/plans/${u.image}.webp`;
export const houseThumb = (u: Unit) => `/img/houses/sm/${u.image}.webp`;
/** Responsive photo: 640px thumb for cards, 1200px for big screens — the browser picks one. */
export const houseSrcSet = (u: Unit) => `/img/houses/sm/${u.image}.webp 640w, /img/houses/${u.image}.webp 1200w`;
export const estateSrcSet = (slug: string) => `/img/objects/sm/${slug}.webp 560w, /img/objects/${slug}.webp 1000w`;
