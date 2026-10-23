'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { readAttribution } from '@/lib/attribution'
import { telHref } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { goal } from './Metrika'

// Every form posts to the CMS: the lead lands in admin → «Заявки» and the region's manager gets a Telegram message.
const ENDPOINT = '/api/leads/submit'

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').replace(/^8/, '7').slice(0, 11)
  const n = d.startsWith('7') ? d.slice(1) : d
  let out = '+7'
  if (n.length) out += ` (${n.slice(0, 3)}`
  if (n.length >= 3) out += `) ${n.slice(3, 6)}`
  if (n.length >= 6) out += `-${n.slice(6, 8)}`
  if (n.length >= 8) out += `-${n.slice(8, 10)}`
  return out
}

export type Interest = 'buy' | 'build' | 'future' | 'mortgage'
/** `house` — house code, `estate` — estate slug: the lead in the admin links to them */
export type LeadTarget = {
  region?: string
  context?: string
  phone?: string | null
  hours?: string | null
  interest?: Interest
  house?: string
  estate?: string
}

// the ways in (home page: build / buy, or just looking at the places): the manager sees in the lead what the person came for
const ASK: { value: Interest; label: string }[] = [
  { value: 'buy', label: 'Купить готовый' },
  { value: 'build', label: 'Построить' },
  { value: 'future', label: 'Пока присматриваюсь' },
]

export function LeadForm({
  light = false,
  row = false,
  cta = 'Отправить',
  target = {},
  ask = false,
}: {
  light?: boolean
  row?: boolean
  cta?: string
  target?: LeadTarget
  /** show «Купить готовый / Построить / Пока присматриваюсь» */
  ask?: boolean
}) {
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [interest, setInterest] = useState<Interest | undefined>(target.interest)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    if (phone.replace(/\D/g, '').length < 11) return
    setState('sending')
    try {
      const { utm, ref, landing } = readAttribution()
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          phone,
          region: target.region,
          house: target.house,
          estate: target.estate,
          context: target.context,
          interest,
          page: window.location.href,
          landing,
          utm,
          ref,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      goal('lead_submit', { region: target.region, context: target.context })
      setState('done')
    } catch {
      setState('error')
    }
  }

  // how much of the number is typed (10 digits after +7): the line under the field fills, a tick when complete
  const digits = Math.max(0, phone.replace(/\D/g, '').length - 1)

  if (state === 'done') {
    return (
      <div className={`form ${light ? 'form--light' : ''}`}>
        <div className="form__ok">
          {/* the brand's house draws itself and a light goes on in its window */}
          <svg className="form__house" viewBox="0 0 48 44" aria-hidden>
            <path d="M3 21 24 4l21 17M9 17v24h30V17" pathLength={1} />
            <rect x="20" y="26" width="8" height="9" rx="1" />
          </svg>
          <b>Спасибо! Заявка принята.</b>
          <p>
            {interest === 'future'
              ? 'Сообщим о новых посёлках, акциях и старте продаж — без навязчивых звонков.'
              : `Менеджер перезвонит${target.hours ? ` в рабочее время (${target.hours.toLowerCase()})` : ' в ближайшее рабочее время'}.`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      className={`form ${light ? 'form--light' : ''} ${row ? 'form--row' : ''}`}
      onSubmit={submit}
    >
      {/* Trap for bots: hidden from people, bots fill every field — the server silently drops such leads. */}
      <div className="form__hp" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {ask && (
        <div className="form__ask" role="radiogroup" aria-label="Что вас интересует">
          {ASK.map((a) => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={interest === a.value}
              className={interest === a.value ? 'is-on' : ''}
              onClick={() => setInterest(a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {/* no visible labels in the design: aria-label gives screen readers what the placeholder shows */}
      <input type="text" name="name" placeholder="Ваше имя" aria-label="Ваше имя" autoComplete="name" required />
      <span
        className={`form__phone ${digits === 10 ? 'is-full' : ''}`}
        style={{ ['--fill' as string]: digits / 10 }}
      >
        <input
          type="tel"
          name="phone"
          placeholder="+7 (___) ___-__-__"
          aria-label="Телефон"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          pattern="\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}"
          title="Номер в формате +7 (999) 123-45-67"
          required
        />
        <i className="form__fill" aria-hidden />
        <i className="form__tick" aria-hidden>
          ✓
        </i>
      </span>
      <label className="form__consent">
        <input type="checkbox" name="consent" required />
        <span>
          Даю <a href={mainHref('/consent')}>согласие на обработку персональных данных</a> и
          ознакомлен с <a href={mainHref('/privacy')}>политикой</a>
        </span>
      </label>
      <button
        className={`btn btn--gold ${state === 'sending' ? 'is-sending' : ''}`}
        type="submit"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Отправляем…' : cta}
      </button>
      {state === 'error' && (
        <p role="alert">
          Не получилось отправить.{' '}
          {target.phone ? (
            <>
              Позвоните нам: <a href={telHref(target.phone)}>{target.phone}</a>
            </>
          ) : (
            'Попробуйте ещё раз через минуту.'
          )}
        </p>
      )}
    </form>
  )
}

/** Compact lead strip placed between sections, so the form is always close (not only at the bottom). */
export function LeadInline({
  title,
  text,
  cta,
  target,
}: {
  title: string
  text: string
  cta: string
  target?: LeadTarget
}) {
  return (
    <div className="lead-inline" data-reveal>
      <div className="lead-inline__text">
        <b>{title}</b>
        <p>{text}</p>
      </div>
      <LeadForm light row cta={cta} target={target} />
    </div>
  )
}

/** Desktop floating «call me back» pill (mobile already has the sticky bottom bar). */
export function FloatingCall() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const on = () => setShown(window.scrollY > window.innerHeight * 0.8) // appears after the first screen
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <a
      href="#lead"
      className={`float-call magnet ${shown ? 'is-shown' : ''}`}
      aria-label="Заказать обратный звонок"
    >
      <span className="float-call__dot" />
      Заказать звонок
    </a>
  )
}

export function LeadSection({
  title,
  text,
  cta,
  target,
  ask = false,
  eyebrow = 'Подбор дома',
}: {
  title: string
  text: string
  cta: string
  target?: LeadTarget
  ask?: boolean
  eyebrow?: string
}) {
  return (
    <section className="section" id="lead" style={{ paddingBottom: 96 }}>
      <div className="container">
        <div className="lead-box">
          <div style={{ display: 'grid', gap: 16 }}>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="title title--lg">{title}</h2>
            <p className="lead">{text}</p>
          </div>
          <LeadForm cta={cta} target={target} ask={ask} />
        </div>
      </div>
    </section>
  )
}
