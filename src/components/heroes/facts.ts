/** Numbers every first-screen variant may show. Computed once in the home from the admin data (home.tsx). */
export type HeroFacts = {
  since: number | null
  years: number | null
  /** houses in our estates (or «built», when the company sets that number in the admin) */
  homes: number
  homesLabel: string
  /** estates with free houses, in the order of the places band */
  selling: { name: string; href: string; free: number }[]
  free: number
  priceFrom: number | null
  projects: number
  /** «Краснодар и Адыгея, скоро — Москва и область» */
  regionsLine: string
}
