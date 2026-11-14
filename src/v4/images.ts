/**
 * Картинки из Gemini для v4: манифест пишет `python tools/v4images.py` (коды — `Промты/lark/хороший-дом-v4-картинки.md`).
 * Нет картинки с кодом — место показывает прежнюю (вид сверху, иллюстрацию, фото проекта), поэтому сайт всегда целый.
 */
import data from './images.json'
import walk from './walk.json'

export type V4Image = { src?: string; phone?: string; w?: number; h?: number }
const MAP = data as Record<string, V4Image>

export const v4img = (code: string): V4Image | undefined => (MAP[code]?.src ? MAP[code] : undefined)

/** слайды первого экрана: проект → код кадра с небом */
export const SLIDE_CODE: Record<string, string> = { 'tip-1': 'С1', 'tip-2': 'С2', 'tip-3': 'С3', 'tip-6': 'С4', 'tip-10': 'С5' }

/** видео прогулки «Внутри» (tools/v4walk.py): склейка клипов, at — секунда, с которой начинается каждая комната */
export type V4Walk = { src?: string; phone?: string; poster?: string; duration: number; at: number[] }
export const WALK = { duration: 0, at: [], ...(walk as Partial<V4Walk>) } as V4Walk
