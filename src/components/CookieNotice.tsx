'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getShared, setShared } from '@/lib/sharedCookie'
import { mainHref } from '@/lib/site'

const KEY = 'hd_cookie_ok'

/**
 * The cookie notice required with Metrika and the VK pixel (152-ФЗ): one line and «Понятно», shown once on the whole
 * site, regions included. It never covers the phone's sticky «Позвонить / Подобрать дом» bar and does not block the page.
 */
export function CookieNotice() {
  const inShowcase = usePathname()?.startsWith('/v4')
  const [shown, setShown] = useState(false)
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser's memory after hydration */
    if (!getShared(KEY)) setShown(true)
  }, [])
  if (!shown) return null
  const ok = () => {
    setShared(KEY, '1', 365 * 86400)
    setShown(false)
  }
  return (
    <div className="cookie" role="region" aria-label="Уведомление о cookie">
      <p>
        Сайт использует cookie и Яндекс Метрику, чтобы понимать, какие страницы полезны. <a href={inShowcase ? '/v4/privacy' : mainHref('/privacy')}>Подробнее</a>
      </p>
      <button type="button" className="btn btn--green" onClick={ok}>
        Понятно
      </button>
    </div>
  )
}
