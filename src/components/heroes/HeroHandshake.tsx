/*
ISC License
Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
import { HouseLines } from '@/components/HouseLines'
import { Pic } from '@/components/Pic'
import type { HeroFacts } from './facts'
import { H, HeroPoints, W, type HeroPoint } from './HeroDepth'

const POINTS: HeroPoint[] = [
  { x: 330, y: 425, lx: 60, ly: 345, title: 'Проект «Тип 5»', text: '105 м², 3 спальни' },
  { x: 1400, y: 560, lx: 1515, ly: 465, title: 'Кирпич и кровля', text: 'только с документами' },
]

const HANDSHAKE = [
  'm11 17 2 2a1 1 0 1 0 3-3',
  'm14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4',
  'm21 3 1 11h-2',
  'M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3',
  'M3 4h8',
]

function Handshake() {
  return (
    <svg className="hh__handshake" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <g className="hh__hand">
        {HANDSHAKE.map((d) => (
          <path key={d} d={d} pathLength={1} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  )
}

export function HeroHandshake({ f, place }: { f: HeroFacts; place: string }) {
  return (
    <section className="hd hx hv hh">
      <div className="hd__wrap">
        <div className="hd__stage">
          <div className="hh__sky" aria-hidden>
            <Pic src="/design/hero1-photo.webp" phone="/design/hero1-photo-900.webp" alt="" />
            <i />
          </div>
          <p className="hd__eyebrow hh__promise">Одно рукопожатие до вашей мечты</p>
          <h1 className="hd__title">
            <span>Хороший</span> <span style={{ ['--d' as string]: '140ms' }}>дом</span>
          </h1>
          <div className="hx__house hv__house">
            <svg className="hd__arc" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
              <circle cx={836} cy={1010} r={760} pathLength={1} vectorEffect="non-scaling-stroke" />
            </svg>
            <HouseLines className="hh__sketch" />
            <div className="hh__reality">
              <Pic
                src="/design/hero1-house.webp"
                phone="/design/hero1-house-900.webp"
                alt="Кирпичный дом «Хорошего дома», проект «Тип 5»"
                priority
              />
              <i className="hv__tone" aria-hidden />
            </div>
            <HeroPoints points={POINTS} />
          </div>
          <div className="hh__footer">
            <p>Капитальные кирпичные дома с участком{place ? ` — ${place}` : ''}.</p>
            <a href="#choose">
              <span>Готовый дом или строительство</span>
              <i aria-hidden>↓</i>
            </a>
          </div>
          <div className="hh__intro">
            <p className="hh__eyebrow">Хороший дом{f.since ? ` · с ${f.since} года` : ''}</p>
            <p className="hh__intro-title">
              <span>Одно рукопожатие</span>
              <span>
                до вашей <em>мечты</em>
              </span>
            </p>
            <div className="hh__deal">
              <Handshake />
            </div>
            <p className="hh__note">Сначала — встреча, показ и ответы на вопросы. Решение — только ваше.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
