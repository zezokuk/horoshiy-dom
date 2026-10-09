import type { Region } from '@/payload-types'
import { getCompany, getRegions } from '@/lib/data'
import { mainHref, regionHref } from '@/lib/site'
import { regionView } from '@/lib/view'
import { Footer } from './Footer'
import { Header, type NavItem } from './Header'
import { FloatingCall, LeadSection } from './LeadForm'
import { StickyCta } from './StickyCta'

/** Brand site menu: what the company does and where. */
const brandNav = (): NavItem[] => [
  { href: mainHref('/#regions'), label: 'Регионы' },
  { href: mainHref('/catalog'), label: 'Готовые дома' },
  { href: mainHref('/build'), label: 'Построить' },
  { href: mainHref('/mortgage'), label: 'Ипотека' },
  { href: mainHref('/about'), label: 'О компании' },
]

/** Region menu: its estates and houses first, company-wide pages after. */
const regionNav = (slug: string): NavItem[] => [
  { href: regionHref(slug, '/#estates'), label: 'Посёлки' },
  { href: regionHref(slug, '/catalog'), label: 'Дома в продаже' },
  { href: mainHref('/build'), label: 'Построить' },
  { href: mainHref('/mortgage'), label: 'Ипотека' },
  { href: regionHref(slug, '/#office'), label: 'Контакты' },
]

/** Page frame shared by the brand site and every region: header, page, lead form, footer. */
export async function Shell({ region, children }: { region?: Region; children: React.ReactNode }) {
  const [company, regions] = await Promise.all([getCompany(), getRegions()])
  const views = regions.map(regionView)
  const current = region ? regionView(region) : undefined
  const phone = region?.office?.phone || company.phone
  const nav = region ? regionNav(region.slug) : brandNav()
  const target = { region: region?.slug, phone, hours: region?.office?.hours }
  const soon = region?.status === 'soon'

  return (
    <>
      <Header
        nav={nav}
        phone={phone}
        regions={views}
        current={current}
        homeHref={region ? regionHref(region.slug) : mainHref('/')}
        ctaHref={region ? regionHref(region.slug, '/catalog') : mainHref('/catalog')}
        slogan={company.slogan}
      />
      <main>{children}</main>
      <LeadSection
        title={soon ? `Узнайте первыми: ${region!.name}` : region ? 'Подберём дом под ваш бюджет' : 'Подберём дом и место под вашу семью'}
        text={
          soon
            ? 'Оставьте телефон — сообщим о старте продаж, ценах и первых домах раньше всех.'
            : 'Расскажем, какие дома свободны прямо сейчас, рассчитаем ипотеку и привезём на показ.'
        }
        cta={soon ? 'Записаться в лист ожидания' : 'Подобрать дом'}
        target={target}
      />
      <Footer company={company} regions={views} nav={nav} current={current} />
      <StickyCta phone={phone} />
      <FloatingCall />
    </>
  )
}
