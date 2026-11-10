import { plural } from '@/lib/format'

/**
 * Home v2, screen 8 «Построить свой дом»: a separate, second scenario at the end (27.10: the company sells houses first
 * and builds to order second). The architect's plan on a blueprint card leads to the 3D story on /build.
 */
export function BuildTeaser({ plan, planNote, projects, buildHref }: { plan?: string; planNote: string; projects: number; buildHref: string }) {
  return (
    <div className="v2-build">
      <div className="v2-build__text" data-reveal>
        <p className="eyebrow">Если нет подходящего готового дома</p>
        <h2 className="title title--lg">
          Обсудим строительство <em>на свободном участке</em>
        </h2>
        <p className="lead">
          Если в посёлке появляется доступная земля, строим на ней один из наших типовых кирпичных домов. Посмотрите, как он
          растёт: план, фундамент, стены, кровля — шаг за шагом в 3D.
        </p>
        <div className="btns">
          <a className="btn btn--green" href={buildHref}>
            Как мы строим
          </a>
          <span className="v2-build__count">
            {projects} {plural(projects, 'проект', 'проекта', 'проектов')} · больше 20 планировок
          </span>
        </div>
      </div>
      {/* data-reveal-photo: in v2 the plan opens with the diagonal curtain (V2Motion) instead of the plain fade; the look
          «dom» keeps its fade and drift as before */}
      <a className="v2-build__plan" href={buildHref} data-reveal data-reveal-photo data-parallax="14" style={{ ['--d' as string]: '120ms' }}>
        {plan && <img src={plan} alt={planNote} loading="lazy" decoding="async" />}
        <span>{planNote}</span>
      </a>
    </div>
  )
}
