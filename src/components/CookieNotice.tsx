'use client'

import { useEffect, useState } from 'react'
import { mainHref } from '@/lib/site'

const KEY = 'hd_cookie_ok'

/**
 * The cookie notice required with Metrika and the VK pixel (152-ФЗ): one line and «Понятно», shown once.
 * It never covers the phone's sticky «Позвонить / Подобрать дом» bar and does not block the page.
 */
export function CookieNotice() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    try {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser's memory after hydration */
      if (!localStorage.getItem(KEY)) setShown(true)
    } catch {
      setShown(true)
    }
  }, [])
  if (!shown) return null
  const ok = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {}
    setShown(false)
  }
  return (
    <div className="cookie" role="region" aria-label="Уведомление о cookie">
      <p>
        Сайт использует cookie и Яндекс Метрику, чтобы понимать, какие страницы полезны. <a href={mainHref('/privacy')}>Подробнее</a>
      </p>
      <button type="button" className="btn btn--green" onClick={ok}>
        Понятно
      </button>
    </div>
  )
}
