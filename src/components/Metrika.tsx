'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { captureAttribution } from '@/lib/attribution'

/**
 * Yandex Metrika and the VK Ads pixel. Both are set at build time (NEXT_PUBLIC_YM_ID, NEXT_PUBLIC_VK_PIXEL_ID);
 * without them nothing loads. Both load async after the page is interactive: if Yandex or VK are down or blocked,
 * the site and its forms work as usual, and the lead source is kept on our side anyway (lib/attribution).
 */
const YM = process.env.NEXT_PUBLIC_YM_ID
const VK = process.env.NEXT_PUBLIC_VK_PIXEL_ID
// the counter script address from the code in the VK Ads cabinet («Пиксели» → код); the old default is kept as a fallback
const VK_SRC = process.env.NEXT_PUBLIC_VK_PIXEL_SRC || 'https://top-fragment.mail.ru/js/code.js'

type Ym = (id: number, action: string, ...args: unknown[]) => void
type Tmr = { push: (e: Record<string, unknown>) => void }

/** Fire a goal in Metrika and in the VK pixel; safe to call when they are not configured or did not load. */
export function goal(name: string, params?: Record<string, unknown>) {
  // each counter on its own: a broken one never silences the other, and analytics never breaks a click or a form
  const w = window as unknown as { ym?: Ym; _tmr?: Tmr }
  try {
    if (YM && typeof w.ym === 'function') w.ym(Number(YM), 'reachGoal', name, params)
  } catch {}
  try {
    if (VK && w._tmr) w._tmr.push({ type: 'reachGoal', id: VK, goal: name })
  } catch {}
}

const MESSENGER = /(^|\/\/)(t\.me|telegram\.me|wa\.me|api\.whatsapp\.com|vk\.me|max\.ru)\//

export function Metrika() {
  const path = usePathname()
  const first = useRef(true)

  // goals that matter for ads: phone and messenger clicks anywhere on the site
  useEffect(() => {
    captureAttribution()
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      if (a.href.startsWith('tel:')) goal('phone_click')
      else if (MESSENGER.test(a.href)) goal('messenger_click', { to: new URL(a.href).hostname })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // page views on client-side navigation (the first view is sent by the counters themselves)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const w = window as unknown as { ym?: Ym; _tmr?: Tmr }
    try {
      if (YM && typeof w.ym === 'function') w.ym(Number(YM), 'hit', window.location.href, { referer: document.referrer })
    } catch {}
    try {
      if (VK && w._tmr) w._tmr.push({ id: VK, type: 'pageView', start: Date.now() })
    } catch {}
  }, [path])

  return (
    <>
      {YM && (
        // not id="ym": an element with that id becomes window.ym, and the snippet then calls a <script> tag («ym is not a function»)
        <Script id="ym-init" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${Number(YM)}, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });`}
        </Script>
      )}
      {VK && (
        <Script id="vk-pixel-init" strategy="afterInteractive">
          {`var _tmr = window._tmr || (window._tmr = []);
_tmr.push({id: ${JSON.stringify(String(VK))}, type: "pageView", start: (new Date()).getTime()});
(function (d, id) { if (d.getElementById(id)) return; var ts = d.createElement("script"); ts.async = true; ts.id = id;
ts.src = ${JSON.stringify(VK_SRC)}; var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s); })(document, "tmr-code");`}
        </Script>
      )}
    </>
  )
}
