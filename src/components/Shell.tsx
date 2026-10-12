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
  { href: mainHref('/build'), label: 'Построить' },
  { href: mainHref('/catalog'), label: 'Готовые дома' },
  { href: mainHref('/locations'), label: 'Локации' },
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

/** A region that is not selling yet has no estates, catalog or office: the waitlist, then what exists elsewhere. */
const soonNav = (): NavItem[] => [
  { href: '#lead', label: 'Лист ожидания' },
  { href: mainHref('/catalog'), label: 'Готовые дома' },
  { href: mainHref('/locations'), label: 'Локации' },
  { href: mainHref('/build'), label: 'Построить' },
  { href: mainHref('/about'), label: 'О компании' },
]

/** Page frame shared by the brand site and every region: header, page, lead form, footer. */
export async function Shell({ region, children }: { region?: Region; children: React.ReactNode }) {
  const [company, regions] = await Promise.all([getCompany(), getRegions()])
  const views = regions.map(regionView)
  const current = region ? regionView(region) : undefined
  const phone = region?.office?.phone || company.phone
  const soon = region?.status === 'soon'
  const nav = soon ? soonNav() : region ? regionNav(region.slug) : brandNav()
  const target = { region: region?.slug, phone, hours: region?.office?.hours, interest: soon ? ('future' as const) : undefined }

  return (
    <>
      <Header
        nav={nav}
        phone={phone}
        regions={views}
        current={current}
        homeHref={region ? regionHref(region.slug) : mainHref('/')}
        ctaHref={region && !soon ? regionHref(region.slug, '/catalog') : mainHref('/catalog')}
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
        cta={soon ? 'Записаться в лист ожидания' : 'Отправить'}
        target={target}
        ask={!soon}
        eyebrow={soon ? 'Лист ожидания' : undefined}
      />
      <Footer company={company} regions={views} nav={nav} current={current} />
      <StickyCta phone={phone} label={soon ? 'Узнать первым' : undefined} />
      <FloatingCall />
    </>
  )
}
