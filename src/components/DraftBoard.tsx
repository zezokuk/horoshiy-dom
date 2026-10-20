import { HouseLines } from './HouseLines'
import { Pic } from './Pic'
import { DraftSplit } from './heroes/DraftSplit'

/**
 * «Чертёж ↔ дом» as a block (was the home's first screen 20.10; Ilya moved the home to «Vintara» and the slider here):
 * «Тип 5» left of the line as the drawing, right of it as the built house; the mouse, a finger or the arrow keys move it.
 */
export function DraftBoard({ caption }: { caption: string }) {
  return (
    <div className="hx dr">
      <div className="hd__wrap">
        <div className="hd__stage">
          <p className="hd__eyebrow">{caption}</p>
          <DraftSplit>
            <HouseLines className="hx__lines" />
            <Pic src="/design/hero1-house.webp" phone="/design/hero1-house-900.webp" alt="Построенный дом по проекту «Тип 5»" />
          </DraftSplit>
        </div>
      </div>
    </div>
  )
}
