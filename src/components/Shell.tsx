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
  // one region on sale: a house lives on krd.…, but it is still one site, so the same menu and the logo always leads to
  // the main page (Igor, 30.10: «захожу на главную, а она кидает на Краснодар»). The region's own menu returns with a second region
  const severalRegions = views.filter((r) => r.status === 'active').length > 1
  const regional = region && !soon && severalRegions
  const nav = soon ? soonNav() : regional ? regionNav(region.slug) : brandNav()
  const target = { region: region?.slug, phone, hours: region?.office?.hours, interest: soon ? ('future' as const) : undefined }

  return (
    <>
      <Header
        nav={nav}
        phone={phone}
        regions={views}
        // one region on sale (Moscow is «not today», 27.10): no switcher in the bar, the mobile menu still lists them
        switcher={severalRegions}
        current={current}
        homeHref={regional ? regionHref(region.slug) : mainHref('/')}
        ctaHref={regional ? regionHref(region.slug, '/catalog') : mainHref('/catalog')}
        slogan={company.slogan}
      />
      <main>{children}</main>
      <LeadSection
        title={soon ? `Узнайте первыми: ${region!.name}` : region ? 'Подберём дом под ваш бюджет' : 'Это место нужно увидеть самому'}
        text={
          soon
            ? 'Оставьте телефон — сообщим о старте продаж, ценах и первых домах раньше всех.'
            : region
              ? 'Расскажем, какие дома свободны прямо сейчас, рассчитаем ипотеку и привезём на показ.'
              : 'Приезжайте на показ: пройдёте по посёлку, зайдёте в дом и посмотрите участок. Расскажем, что свободно, и посчитаем ипотеку.'
        }
        cta={soon ? 'Записаться в лист ожидания' : region ? 'Отправить' : 'Записаться на показ'}
        target={target}
        ask={!soon}
        eyebrow={soon ? 'Лист ожидания' : region ? undefined : 'Показ'}
        offices={!region ? (company.offices ?? []).map((o) => ({ title: o.title, address: o.address, hours: o.hours })) : undefined}
        phone={!region ? phone : undefined}
      />
      <Footer company={company} regions={views} nav={nav} current={current} />
      <StickyCta phone={phone} label={soon ? 'Узнать первым' : undefined} />
      <FloatingCall />
    </>
  )
}
