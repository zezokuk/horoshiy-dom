'use client'

import { usePathname } from 'next/navigation'

/**
 * The brand home ends in its own lead form (the evening finale, EveningFinale, night 09→10.11), so the frame's shared form
 * is left out there and appears on every other page. Only for the brand site's Shell: a region's home is «/» on its own
 * subdomain and keeps the shared form.
 */
export function SkipOnHome({ children }: { children: React.ReactNode }) {
  return usePathname() === '/' ? null : children
}
