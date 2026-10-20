/**
 * «Тип 5» traced from the client's floor plan (рендер-по-плану/вход-план-тип5.png, 1540×1660 px, ≈116 px per metre:
 * the kitchen-living room measures 27.2 m² on it). Coordinates are plan pixels; the build scene converts them to metres
 * around the plan centre. The plan's bottom edge (porch and entrance) faces the camera (+Z).
 */
export const PX_PER_M = 116
export const PLAN_CENTER = { x: 752, y: 720 }

/** Outward side of an exterior wall: s = towards the entrance (+Z), n, e (+X), w. */
export type Side = 'n' | 's' | 'e' | 'w'
export type Opening = [from: number, to: number, kind: 'w' | 'd']
export type Wall = { a: [number, number]; b: [number, number]; t: number; out?: Side; open?: Opening[] }

const EXT = 44
const INT = 24

export const WALLS: Wall[] = [
  // exterior
  { a: [880, 68], b: [1460, 68], t: EXT, out: 'n', open: [[945, 1330, 'w']] }, // kitchen-living: the wide window
  { a: [1438, 45], b: [1438, 1395], t: EXT, out: 'e', open: [[590, 750, 'w']] },
  { a: [880, 1373], b: [1460, 1373], t: EXT, out: 's', open: [[1078, 1265, 'w']] }, // bedroom 14.6
  { a: [900, 1245], b: [900, 1395], t: EXT, out: 'w' },
  { a: [830, 1268], b: [900, 1268], t: EXT, out: 's' },
  { a: [45, 1268], b: [830, 1268], t: EXT, out: 's', open: [[60, 160, 'w'], [445, 500, 'w'], [710, 830, 'd']] }, // entrance
  { a: [67, 440], b: [67, 1290], t: EXT, out: 'w', open: [[600, 775, 'w'], [1100, 1250, 'w']] },
  { a: [45, 462], b: [900, 462], t: EXT, out: 'n' }, // towards the terrace
  { a: [900, 45], b: [900, 440], t: EXT, out: 'w', open: [[100, 300, 'w'], [310, 420, 'd']] }, // glass to the terrace
  // interior
  { a: [597, 485], b: [597, 740], t: INT },
  { a: [597, 708], b: [905, 708], t: INT, open: [[695, 790, 'd']] },
  { a: [905, 440], b: [905, 715], t: INT },
  { a: [67, 868], b: [610, 868], t: INT },
  { a: [597, 1000], b: [597, 1268], t: INT },
  { a: [900, 830], b: [900, 1245], t: 32, open: [[1000, 1100, 'd']] },
  { a: [900, 835], b: [1438, 835], t: INT },
  { a: [910, 920], b: [1100, 920], t: INT },
  { a: [1110, 835], b: [1110, 1000], t: INT },
  { a: [910, 992], b: [1438, 992], t: INT, open: [[1120, 1210, 'd']] },
]

/** Floor of the house (two rectangles) and the terrace deck, [x1, y1, x2, y2]. */
export const FLOORS: [number, number, number, number][] = [
  [45, 440, 920, 1290],
  [880, 45, 1460, 1395],
]
export const TERRACE: [number, number, number, number] = [170, 45, 880, 440]
/** Hip roofs: over the living/bedroom wing and over the left block. */
export const ROOFS: [number, number, number, number][] = [
  [880, 45, 1460, 1395],
  [45, 440, 920, 1290],
]

/** Furniture where the plan draws it: [x1, y1, x2, y2, height m, material]. */
export type Piece = [number, number, number, number, number, 'oat' | 'walnut' | 'white' | 'olive' | 'linen' | 'rug']
export const FURNITURE: Piece[] = [
  // bedroom 13.6
  [190, 545, 375, 715, 0.5, 'linen'],
  [190, 530, 375, 548, 1.05, 'walnut'],
  [130, 490, 185, 530, 0.5, 'walnut'],
  [380, 490, 435, 530, 0.5, 'walnut'],
  [515, 487, 585, 715, 2.2, 'white'],
  [190, 805, 375, 852, 0.75, 'walnut'],
  // guest room
  [165, 1120, 430, 1240, 0.8, 'oat'],
  [165, 1205, 430, 1240, 1.0, 'oat'],
  [515, 1020, 585, 1245, 2.2, 'white'],
  [180, 960, 420, 1100, 0.02, 'rug'],
  // hall
  [610, 1020, 700, 1245, 2.2, 'white'],
  [920, 935, 1100, 985, 2.2, 'white'],
  // bathroom 4.6
  [630, 492, 672, 560, 0.45, 'white'],
  [705, 490, 795, 556, 0.55, 'white'],
  [820, 490, 872, 530, 0.85, 'white'],
  // bathroom 3.0
  [1130, 848, 1192, 890, 0.85, 'white'],
  [1240, 850, 1280, 918, 0.45, 'white'],
  // kitchen-living
  [1350, 95, 1415, 515, 0.92, 'white'],
  [1350, 520, 1415, 820, 2.15, 'white'],
  [1130, 180, 1230, 355, 0.76, 'walnut'],
  [1095, 210, 1125, 245, 0.48, 'oat'],
  [1095, 290, 1125, 325, 0.48, 'oat'],
  [1235, 210, 1265, 245, 0.48, 'oat'],
  [1235, 290, 1265, 325, 0.48, 'oat'],
  [930, 445, 1040, 700, 0.8, 'oat'],
  [930, 445, 960, 700, 1.0, 'oat'],
  [1040, 465, 1115, 520, 0.8, 'olive'],
  [1060, 540, 1300, 730, 0.02, 'rug'],
  [1120, 570, 1185, 635, 0.42, 'walnut'],
  // bedroom 14.6
  [1180, 1100, 1345, 1280, 0.5, 'linen'],
  [1345, 1100, 1362, 1280, 1.05, 'walnut'],
  [1370, 1045, 1412, 1092, 0.5, 'walnut'],
  [1370, 1288, 1412, 1335, 0.5, 'walnut'],
  [928, 1130, 952, 1240, 1.9, 'white'],
  // terrace
  [455, 185, 630, 285, 0.76, 'walnut'],
]

/** Potted plants (olive trees) inside, [x, y, scale]. */
export const PLANTS: [number, number, number][] = [
  [1300, 120, 1],
  [1020, 1320, 0.8],
  [120, 820, 0.8],
  [800, 90, 1],
]
