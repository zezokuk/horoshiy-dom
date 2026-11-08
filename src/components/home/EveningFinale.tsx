'use client'

import { useRef } from 'react'
import { LeadForm, type LeadTarget } from '@/components/LeadForm'
import { telHref } from '@/lib/format'
import { useScrollVar } from '@/lib/useScrollVar'

export type Office = { title: string; address: string; hours?: string | null }

/**
 * The home's last screen (night 09→10.11, frame «ночь → рассвет → день → вечер», Igor's vision screen 8): the same house as
 * on the first screen, now in the evening, and the lights come on in its windows as the screen comes up — the rhyme to the
 * night at the start. «Ваша история начинается здесь» and the shortest form: name and phone, «Записаться на показ».
 *
 * Until the evening picture is made (newv2/картинки/для-chatgpt-кадры/результаты/вечер.png) the evening is the morning
 * photo dimmed by CSS. The windows are placed on the picture itself: `.evf__frame` is cut exactly like the photo
 * (cover, 50% 60%), so the lights stay on the windows at any screen width. Pass `photo` for the real evening shot.
 * It is the page's #lead: the floating «Заказать звонок» and the phone's bottom bar lead here (Shell skips its own form on «/»).
 */
export function EveningFinale({
  photo,
  phonePhoto,
  offices = [],
  phone,
  target,
}: {
  photo?: string
  phonePhoto?: string
  offices?: Office[]
  phone?: string | null
  target?: LeadTarget
}) {
  const ref = useRef<HTMLElement>(null)
  useScrollVar(ref, 0.9, 0.15)
  const real = !!photo
  return (
    <section ref={ref} className={`evf ${real ? 'evf--photo' : 'evf--css'}`} id="lead" aria-labelledby="evf-title">
      <div className="evf__pane">
        <div className="evf__frame" aria-hidden>
          <picture>
            <source media="(max-width: 759px)" srcSet={phonePhoto ?? (real ? photo : '/design/hero-morning-phone.webp')} />
            <img src={photo ?? '/design/hero-morning.webp'} alt="" loading="lazy" decoding="async" />
          </picture>
          {!real && (
            <>
              <i className="evf__sky" />
              <i className="evf__win evf__win--l" />
              <i className="evf__win evf__win--door" />
              <i className="evf__win evf__win--r" />
              <i className="evf__spill" />
            </>
          )}
        </div>
        <i className="evf__scrim" aria-hidden />
        <div className="evf__copy">
          <p className="evf__eyebrow">Вечер в своём доме</p>
          <h2 className="evf__title" id="evf-title">
            Ваша история начинается здесь
          </h2>
        </div>
      </div>

      <div className="evf__panel">
        <div className="evf__text">
          <p className="evf__lead">Выберите готовый дом — мы покажем его вживую и ответим на вопросы по участку, документам и покупке.</p>
          {offices.length > 0 && (
            <ul className="evf__offices">
              {offices.map((o) => (
                <li key={o.address}>
                  <b>{o.title}</b>
                  <span>
                    {o.address}
                    {o.hours ? ` · ${o.hours}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {phone && (
            <a className="evf__phone" href={telHref(phone)}>
              {phone}
            </a>
          )}
        </div>
        <div className="evf__form">
          <p className="evf__form-title">Записаться на показ</p>
          <LeadForm cta="Записаться на показ" target={{ interest: 'buy', context: 'Главная: вечерний финал', ...target }} />
        </div>
      </div>
    </section>
  )
}
