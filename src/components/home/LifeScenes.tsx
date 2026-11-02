import fs from 'node:fs'
import path from 'node:path'
import { Sprinkle } from './Sprinkle'

// the client's own scenes (27.10, «Мысли и ощущения о загородной жизни»); a slide appears as soon as its picture is put
// into public/design/scenes/ (prompts: БАЗА/Промты/lark/). Without one it stays away: pale empty cards were the weakest
// moment of the page (call of 30.10)
// `smoke`: where smoke or steam rises on that picture (the grill, a chimney), in % of the slide — set it once the picture is
// in, by eye on a screenshot; the puffs are pure CSS (.v2-steam, v2.css)
type Scene = { file: string; season: string; text: string; smoke?: { left: string; top: string }[] }
const SCENES: Scene[] = [
  { file: 'lawn', season: 'Лето', text: 'Дети на газоне с поливалкой и собакой' },
  { file: 'breakfast', season: 'Лето', text: 'Тихий завтрак на воздухе' },
  { file: 'car', season: 'Лето', text: 'Машина заезжает прямо во двор' },
  { file: 'grill', season: 'Лето', text: 'Шашлык с друзьями и вечерние огни на участке' },
  { file: 'fireplace', season: 'Зима', text: 'Камин, ёлка и кот на кресле' },
  { file: 'snow', season: 'Зима', text: 'Снежки и снеговик у своего дома' },
]

const has = (f: string) => fs.existsSync(path.join(process.cwd(), 'public', 'design', 'scenes', `${f}.webp`))

/**
 * Home v2, screen 6, the one sideways stretch of the page (Ilya, 30.10: «дольше вправо и только в одном месте», big slides
 * with more picture than text, as on ERA): the mood in the client's words, then a year at home, slide by slide.
 */
export function LifeScenes() {
  return (
    <ul className="v2-story">
      <li className="v2-slide v2-slide--intro">
        <p className="eyebrow">Жизнь за городом</p>
        <h2 className="v2-slide__words">
          <span>Размеренный ритм.</span> <span>Чувство.</span> <span>Воздух.</span>
        </h2>
        <p className="lead">
          Это дом, в который возвращаешься не потому, что нужно, а потому, что хочется. Тишина здесь — не просто отсутствие
          шума, а чувство, что своё пространство принадлежит только вам.
        </p>
      </li>
      {SCENES.filter((s) => has(s.file)).map((s) => (
        <li key={s.file} className="v2-slide">
          {/* not lazy: a slide comes in sideways through a transform and was still empty when it reached the screen */}
          <img src={`/design/scenes/${s.file}.webp`} alt={s.text} decoding="async" />
          {s.file === 'lawn' && <Sprinkle />}
          {s.smoke?.map((at) => (
            <span key={`${at.left}${at.top}`} className="v2-steam v2-steam--smoke" style={at} aria-hidden>
              <i />
              <i />
              <i />
            </span>
          ))}
          <span className="v2-slide__season">{s.season}</span>
          <span className="v2-slide__text">{s.text}</span>
        </li>
      ))}
    </ul>
  )
}
