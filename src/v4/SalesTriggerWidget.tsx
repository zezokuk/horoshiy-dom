'use client'

import { useEffect, useRef, useState } from 'react'
import { LeadForm } from '@/components/LeadForm'
import { formatMillions } from '@/lib/format'
import './salesTrigger.css'

type Props = {
  phone?: string | null
  offer?: { href: string; price: number } | null
}

export function SalesTriggerWidget({ phone, offer }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(1)
  const [bedrooms, setBedrooms] = useState('')
  const [payment, setPayment] = useState('')

  useEffect(() => {
    // Keep the shopping controls, walkthrough and booking form unobstructed.
    const sections = document.querySelectorAll('.buyer-hero, #doma, #vnutri, #karta, .hd-spread, .v4-catalog-pick, .np-gp, #evf-form, .v4-foot')
    const onscreen = new Set<Element>()
    const sync = () => setVisible(window.scrollY > window.innerHeight * .8 && onscreen.size === 0)
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) onscreen.add(entry.target)
        else onscreen.delete(entry.target)
      }
      sync()
    })
    sections.forEach(section => observer.observe(section))
    window.addEventListener('scroll', sync, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', sync)
    }
  }, [])

  useEffect(() => {
    if (dialog.current?.open) heading.current?.focus()
  }, [step])

  const open = () => dialog.current?.showModal()
  const options = step === 1
    ? ['2 спальни', '3 спальни', '4 спальни и больше', 'Пока выбираю']
    : ['Ипотека', 'Собственные средства', 'Обсудить с менеджером']

  return <>
    <button type="button" className="st-footer-link" aria-haspopup="dialog" onClick={open}>Помочь с выбором дома</button>
    {visible && <button type="button" className="st-helper" aria-haspopup="dialog" onClick={open}>Подобрать дом</button>}
    <dialog ref={dialog} className="st-picker" aria-labelledby="st-title" onClick={e => {
      if (e.target === e.currentTarget) dialog.current?.close()
    }}>
      <div className="st-picker__panel">
        <div className="st-picker__head">
          <span>Подбор дома · {step} из 3</span>
          <button type="button" className="st-close" onClick={() => dialog.current?.close()} aria-label="Закрыть подбор">×</button>
        </div>
        <h2 id="st-title" ref={heading} tabIndex={-1}>{step === 1 ? 'Сколько нужно спален?' : step === 2 ? 'Как планируете оплатить?' : 'Получить подборку'}</h2>
        {step < 3 ? <div className="st-choices">
          {options.map(option => <button key={option} type="button" onClick={() => {
            if (step === 1) setBedrooms(option)
            else setPayment(option)
            setStep(step + 1)
          }}>{option}<span aria-hidden>→</span></button>)}
        </div> : <>
          <p className="st-summary">{bedrooms} · {payment}</p>
          <LeadForm light target={{ phone, interest: 'buy', context: `Подбор дома: ${bedrooms} · ${payment}` }} cta="Получить подборку" />
        </>}
        {step > 1 && <button type="button" className="st-back" onClick={() => setStep(step - 1)}>← Назад</button>}
        {step === 1 && offer && <a className="st-offer-link" href={offer.href}>
          Дом в Новой Адыгее · {formatMillions(offer.price)} <span aria-hidden>↗</span>
        </a>}
      </div>
    </dialog>
  </>
}
