/**
 * Ring slices — the «fan» of photos from reference 49d13… («The Gali»): used by the projects fan on «Построить»
 * and by the region's first screen. Angles in degrees; SVG y goes down, so 90 is straight down and 270 straight up.
 */
export type Ring = { cx: number; cy: number; r1: number; r2: number }

const rad = (a: number) => (a * Math.PI) / 180
export const f1 = (n: number) => n.toFixed(1)
export const ringPoint = (g: Ring, r: number, a: number) => [g.cx + r * Math.cos(rad(a)), g.cy + r * Math.sin(rad(a))] as const

/** The slice between angles a0 < a1 (less than 180° wide): its path and the box a photo must cover to fill it. */
export function ringSlice(g: Ring, a0: number, a1: number) {
  const [x0, y0] = ringPoint(g, g.r2, a0)
  const [x1, y1] = ringPoint(g, g.r2, a1)
  const [x2, y2] = ringPoint(g, g.r1, a1)
  const [x3, y3] = ringPoint(g, g.r1, a0)
  const path = `M${f1(x0)} ${f1(y0)} A${g.r2} ${g.r2} 0 0 1 ${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)} A${g.r1} ${g.r1} 0 0 0 ${f1(x3)} ${f1(y3)} Z`
  // sampled along the outer arc, which may bulge past the corners
  const xs = [x0, x1, x2, x3]
  const ys = [y0, y1, y2, y3]
  for (let a = a0; a <= a1; a += 2) {
    const [x, y] = ringPoint(g, g.r2, a)
    xs.push(x)
    ys.push(y)
  }
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  return { path, box }
}
