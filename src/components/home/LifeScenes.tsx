import fs from 'node:fs'
import path from 'node:path'

// the client's own scenes (27.10, «Мысли и ощущения о загородной жизни»); a picture appears as soon as its file is put
// into public/design/scenes/ (prompts: БАЗА/Промты/lark/), until then the card is typographic
const SCENES = [
  { file: 'breakfast', season: 'Лето', text: 'Тихий завтрак на воздухе' },
  { file: 'lawn', season: 'Лето', text: 'Дети на газоне с поливалкой и собакой' },
  { file: 'grill', season: 'Лето', text: 'Шашлык с друзьями и вечерние огни на участке' },
  { file: 'car', season: 'Лето', text: 'Машина заезжает прямо во двор' },
  { file: 'fireplace', season: 'Зима', text: 'Камин, ёлка и кот на кресле' },
  { file: 'snow', season: 'Зима', text: 'Снежки и снеговик у своего дома' },
]

const has = (f: string) => fs.existsSync(path.join(process.cwd(), 'public', 'design', 'scenes', `${f}.webp`))

/** Home v2, screen 6: «Наши дома в трёх словах» — the mood, in the client's words, then the scenes of a year at home. */
export function LifeScenes() {
  return (
    <div className="v2-life">
      <div className="v2-life__head" data-reveal>
        <p className="eyebrow">Жизнь за городом</p>
        <h2 className="v2-life__words">
          <span>Размеренный ритм.</span> <span>Чувство.</span> <span>Воздух.</span>
        </h2>
        <p className="lead">
          Это дом, в который возвращаешься не потому, что нужно, а потому, что хочется. Тишина здесь — не просто отсутствие
          шума, а чувство, что своё пространство принадлежит только вам.
        </p>
      </div>
      <ul className="v2-life__row">
        {SCENES.map((s, i) => {
          const pic = has(s.file)
          return (
            <li key={s.file} className={`v2-scene ${pic ? '' : 'v2-scene--text'} v2-scene--${s.season === 'Зима' ? 'winter' : 'summer'}`} data-reveal style={{ ['--d' as string]: `${i * 70}ms` }}>
              {pic && <img src={`/design/scenes/${s.file}.webp`} alt={s.text} loading="lazy" decoding="async" />}
              <span className="v2-scene__season">{s.season}</span>
              <span className="v2-scene__text">{s.text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
