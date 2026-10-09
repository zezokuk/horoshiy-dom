"use client";

import Script from "next/script";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

// Yandex Metrika: set NEXT_PUBLIC_YM_ID at build time; without it nothing loads (demo stays clean).
const YM = process.env.NEXT_PUBLIC_YM_ID;

type Ym = (id: number, action: string, ...args: unknown[]) => void;

/** Fire a Metrika goal; safe to call when Metrika is not configured. */
export function goal(name: string, params?: Record<string, unknown>) {
  const ym = (window as unknown as { ym?: Ym }).ym;
  if (YM && ym) ym(Number(YM), "reachGoal", name, params);
}

export function Metrika() {
  // Goals that matter for ads: phone and messenger clicks anywhere on the site.
  useEffect(() => {
    captureAttribution();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      if (a.href.startsWith("tel:")) goal("phone_click");
      else if (a.href.includes("t.me/")) goal("telegram_click");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!YM) return null;
  return (
    <Script id="ym" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${Number(YM)}, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });`}
    </Script>
  );
}
