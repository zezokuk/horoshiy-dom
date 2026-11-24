'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { goal } from '@/components/Metrika'
import './salesTrigger.css'

const PROMPTS = [
  'Помочь подобрать дом под ваш бюджет?',
  'Есть готовые дома с заездом в этом месяце — показать?',
  'Отвечу по газу, участку и ипотеке от 6%',
  'Записать на живой показ или видео-тур?',
] as const

const OFFER_SEEN_KEY = 'hd_offer_seen_v4'
const OFFER_CLOSED_KEY = 'hd_offer_closed_v4'

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

export function SalesTriggerWidget({ phone }: { phone?: string | null }) {
  const [visible, setVisible] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)
  const [bubbleHidden, setBubbleHidden] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // 3-шаговый мини-подбор
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [bedrooms, setBedrooms] = useState('3 спальни')
  const [payment, setPayment] = useState('Семейная ипотека 6%')
  const [channel, setChannel] = useState('Позвонить')
  const [pickPhone, setPickPhone] = useState('')
  const [pickState, setPickState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  // Отложенное спецпредложение «В Новый год — в свой дом»
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerBadge, setOfferBadge] = useState(false)
  const [offerPhone, setOfferPhone] = useState('')
  const [offerState, setOfferState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  useEffect(() => {
    const startAt = Date.now()
    let offered = sessionStorage.getItem(OFFER_SEEN_KEY) === '1'
    if (sessionStorage.getItem(OFFER_CLOSED_KEY) === '1') {
      setOfferBadge(true)
    }

    const triggerOffer = () => {
      if (offered) return
      offered = true
      sessionStorage.setItem(OFFER_SEEN_KEY, '1')
      setOfferOpen(true)
      goal('v4_special_offer_show')
    }

    const checkScroll = () => {
      const y = window.scrollY
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const depth = y / maxScroll
      setVisible(y > Math.min(520, window.innerHeight * 0.72))

      if (!offered && Date.now() - startAt >= 45_000 && depth >= 0.4) {
        triggerOffer()
      }
    }

    const timer = window.setInterval(() => {
      if (!offered && Date.now() - startAt >= 45_000) {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        if (window.scrollY / maxScroll >= 0.4) {
          triggerOffer()
        }
      }
    }, 3000)

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 8 && window.scrollY > 220 && !offered && window.innerWidth >= 900) {
        triggerOffer()
      }
    }

    checkScroll()
    window.addEventListener('scroll', checkScroll, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', checkScroll)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  useEffect(() => {
    if (!visible || bubbleHidden || pickerOpen) return
    const id = window.setInterval(() => {
      setPromptIdx((i) => (i + 1) % PROMPTS.length)
    }, 20_000)
    return () => window.clearInterval(id)
  }, [visible, bubbleHidden, pickerOpen])

  const closeOffer = () => {
    sessionStorage.setItem(OFFER_SEEN_KEY, '1')
    sessionStorage.setItem(OFFER_CLOSED_KEY, '1')
    setOfferOpen(false)
    setOfferBadge(true)
  }

  async function submitPicker(e: FormEvent) {
    e.preventDefault()
    if (pickPhone.replace(/\D/g, '').length < 11) return
    setPickState('sending')
    try {
      const res = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Мини-подбор (${bedrooms})`,
          phone: pickPhone,
          interest: 'buy',
          context: `Виджет подбора: ${bedrooms} · ${payment} · связь: ${channel}`,
          page: window.location.href,
        }),
      })
      if (!res.ok) throw new Error('status')
      goal('v4_widget_picker_submit')
      setPickState('done')
    } catch {
      setPickState('error')
    }
  }

  async function submitOffer(e: FormEvent) {
    e.preventDefault()
    if (offerPhone.replace(/\D/g, '').length < 11) return
    setOfferState('sending')
    try {
      const res = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Акция: В Новый год — в свой дом',
          phone: offerPhone,
          interest: 'buy',
          estate: 'nova-adygeya',
          context: 'Спецпредложение Новая Адыгея: 13 500 000 ₽ (выгода 1 500 000 ₽ вместо 15 000 000 ₽ · 35 966 ₽/мес)',
          page: window.location.href,
        }),
      })
      if (!res.ok) throw new Error('status')
      goal('v4_special_offer_submit')
      setOfferState('done')
      sessionStorage.setItem(OFFER_SEEN_KEY, '1')
      sessionStorage.setItem(OFFER_CLOSED_KEY, '1')
    } catch {
      setOfferState('error')
    }
  }

  return (
    <>
      <div className={`st-dock${visible ? ' is-visible' : ''}`} aria-live="polite">
        {visible && !bubbleHidden && !pickerOpen && (
          <div className="st-bubble" role="status">
            <button
              type="button"
              className="st-bubble__text"
              onClick={() => {
                setPickerOpen(true)
                setBubbleHidden(true)
              }}
            >
              {PROMPTS[promptIdx]}
            </button>
            <button
              type="button"
              className="st-bubble__close"
              aria-label="Свернуть подсказку"
              onClick={() => setBubbleHidden(true)}
            >
              ✕
            </button>
          </div>
        )}

        {pickerOpen && (
          <div className="st-popover" role="dialog" aria-label="Быстрый подбор дома">
            <div className="st-popover__head">
              <div>
                <span>Шаг {step} из 3</span>
                <b>Подбор готового дома</b>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Закрыть подбор">
                ✕
              </button>
            </div>

            {pickState === 'done' ? (
              <div className="st-popover__done">
                <b>Заявка отправлена</b>
                <p>Подберём свободные варианты ({bedrooms}, {payment.toLowerCase()}) и вышлем планировки.</p>
                {phone && <small>Если вопрос срочный: {phone}</small>}
              </div>
            ) : step === 1 ? (
              <div className="st-popover__body">
                <p>Сколько спален нужно семье?</p>
                <div className="st-choices">
                  {['2 спальни', '3 спальни', '4 спальни / мансарда'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={bedrooms === v ? 'is-on' : undefined}
                      onClick={() => {
                        setBedrooms(v)
                        setStep(2)
                      }}
                    >
                      {v} →
                    </button>
                  ))}
                </div>
              </div>
            ) : step === 2 ? (
              <div className="st-popover__body">
                <p>Какой формат оплаты удобнее?</p>
                <div className="st-choices">
                  {['Семейная ипотека 6%', 'IT / Сельская / Военная', 'Маткапитал в ПВ / Наличные'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={payment === v ? 'is-on' : undefined}
                      onClick={() => {
                        setPayment(v)
                        setStep(3)
                      }}
                    >
                      {v} →
                    </button>
                  ))}
                </div>
                <button type="button" className="st-back" onClick={() => setStep(1)}>
                  ← Назад
                </button>
              </div>
            ) : (
              <form className="st-popover__body" onSubmit={submitPicker}>
                <p>Куда отправить подходящие дома?</p>
                <div className="st-channels" role="group" aria-label="Способ связи">
                  {['Позвонить', 'Telegram', 'WhatsApp'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      className={channel === ch ? 'is-on' : undefined}
                      onClick={() => setChannel(ch)}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+7 (___) ___-__-__"
                  aria-label="Номер телефона"
                  value={pickPhone}
                  onChange={(e) => setPickPhone(formatPhone(e.target.value))}
                  required
                />
                <button type="submit" className="v3-btn v3-btn--main st-submit" disabled={pickState === 'sending'}>
                  {pickState === 'sending' ? 'Отправляем…' : 'Получить подборку →'}
                </button>
                {pickState === 'error' && <small className="st-err">Не удалось отправить — попробуйте ещё раз.</small>}
                <button type="button" className="st-back" onClick={() => setStep(2)}>
                  ← Назад
                </button>
              </form>
            )}
          </div>
        )}

        <div className="st-pills">
          {offerBadge && !offerOpen && (
            <button
              type="button"
              className="st-offer-chip"
              onClick={() => setOfferOpen(true)}
              title="Открыть спецпредложение −1,5 млн ₽"
            >
              −1,5 млн ₽
            </button>
          )}
          <button
            type="button"
            className={`st-helper${pickerOpen ? ' is-open' : ''}`}
            onClick={() => {
              setPickerOpen((v) => !v)
              setBubbleHidden(true)
            }}
            aria-expanded={pickerOpen}
          >
            <span className="st-dot" aria-hidden />
            <span>Подобрать дом</span>
          </button>
        </div>
      </div>

      {offerOpen && (
        <div className="st-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="st-offer-title">
          <div className="st-modal">
            <button type="button" className="st-modal__close" onClick={closeOffer} aria-label="Закрыть спецпредложение">
              ✕
            </button>
            <div className="st-modal__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/v4/houses/type10-entry.webp" alt="Готовый кирпичный дом в Новой Адыгее" />
              <span className="st-modal__save">Выгода 1 500 000 ₽</span>
            </div>
            <div className="st-modal__body">
              <p className="st-modal__eyebrow">Персональное спецпредложение · акция</p>
              <h2 id="st-offer-title">
                В Новый год — <em>в свой дом</em>
              </h2>
              <p className="st-modal__place">Готовый кирпичный дом · ИЖС · Газ · Новая Адыгея</p>

              <div className="st-modal__pricebox">
                <div>
                  <s>15 000 000 ₽</s>
                  <b>13 500 000 ₽</b>
                </div>
                <span>
                  <b>35 966 ₽ / мес</b>
                  <small>по семейной ипотеке 6%</small>
                </span>
              </div>

              {offerState === 'done' ? (
                <div className="st-modal__done">
                  <b>Спеццена 13 500 000 ₽ закреплена</b>
                  <p>Фиксация действует 48 часов за вашим номером. Менеджер свяжется и отправит планировку дома.</p>
                </div>
              ) : (
                <form className="st-modal__form" onSubmit={submitOffer}>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="+7 (___) ___-__-__"
                    aria-label="Ваш телефон для фиксации спеццены"
                    value={offerPhone}
                    onChange={(e) => setOfferPhone(formatPhone(e.target.value))}
                    required
                  />
                  <button type="submit" className="v3-btn v3-btn--main" disabled={offerState === 'sending'}>
                    {offerState === 'sending' ? 'Фиксируем…' : 'Закрепить спеццену на 48 часов →'}
                  </button>
                  {offerState === 'error' && <small className="st-err">Ошибка отправки — попробуйте ещё раз.</small>}
                  <small className="st-modal__note">
                    Фиксация цены ни к чему не обязывает · без спама и лишних звонков
                  </small>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
