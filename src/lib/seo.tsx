import type { Company, Estate, Region } from '@/payload-types'
import { formatArea, formatPrice, plural, STATUS_LABEL } from './format'
import { MAIN_URL, regionHref } from './site'
import type { HouseView } from './view'

/**
 * SEO and GEO from the admin's data — nothing is typed in by hand here.
 * JSON-LD (schema.org) gives Yandex/Google rich snippets and AI assistants clean facts: the company,
 * an estate with its houses, a house with its price and availability, breadcrumbs, FAQ.
 * The same facts feed /llms.txt (see app/(frontend)/llms.txt).
 */
export function JsonLd({ data }: { data: object }) {
  // «<» escaped: a text from the admin can never close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

/** Uploaded files are served at /api/media/… on every host; search engines need the full address. */
export const absUrl = (u?: string | null) => (!u ? undefined : /^https?:/.test(u) ? u : `${MAIN_URL}${u}`)

const AVAILABILITY = {
  free: 'https://schema.org/InStock',
  reserved: 'https://schema.org/Reserved',
  sold: 'https://schema.org/SoldOut',
} as const

export function organizationLd(company: Company, regions: Region[]) {
  const office = regions.find((r) => r.status === 'active' && r.office?.address)?.office
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: company.legalName || company.name,
    alternateName: company.name,
    slogan: company.slogan || undefined,
    url: MAIN_URL,
    telephone: company.phone || undefined,
    email: company.email || undefined,
    foundingDate: company.since ? String(company.since) : undefined,
    address: office?.address ? { '@type': 'PostalAddress', streetAddress: office.address, addressCountry: 'RU' } : undefined,
    areaServed: regions.filter((r) => r.status === 'active').map((r) => r.name),
    sameAs: company.telegram ? [company.telegram] : undefined,
  }
}

export function faqLd(faq: Company['faq']) {
  if (!faq?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function breadcrumbsLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  }
}

const estateAddress = (e: Estate, region: Region) => ({
  '@type': 'PostalAddress',
  streetAddress: e.address || e.place || undefined,
  addressRegion: region.name,
  addressCountry: 'RU',
})
const geo = (lat?: number | null, lng?: number | null) =>
  lat != null && lng != null ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } : undefined

export function estateLd(e: Estate, region: Region, houses: HouseView[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${e.kind || 'Посёлок'} «${e.name}»`,
    description: [e.tagline, e.description].filter(Boolean).join('. ') || undefined,
    url: regionHref(region.slug, `/objects/${e.slug}`),
    address: estateAddress(e, region),
    geo: geo(e.lat, e.lng),
    containsPlace: houses.map((h) => ({ '@type': 'SingleFamilyResidence', name: `${h.title}, ${formatArea(h.area)} м²`, url: h.href })),
  }
}

export function houseLd(h: HouseView, e: Estate, region: Region, sellerName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SingleFamilyResidence',
    name: `Дом ${formatArea(h.area)} м² (${h.title}) в посёлке «${e.name}»`,
    url: h.href,
    image: absUrl(h.photo),
    floorSize: { '@type': 'QuantitativeValue', value: h.area, unitCode: 'MTK' },
    numberOfBedrooms: h.bedrooms ?? undefined,
    numberOfBathroomsTotal: h.bathrooms ?? undefined,
    address: estateAddress(e, region),
    geo: geo(e.lat, e.lng),
    offers: {
      '@type': 'Offer',
      price: h.price,
      priceCurrency: 'RUB',
      availability: AVAILABILITY[h.status],
      seller: { '@type': 'Organization', name: sellerName },
    },
  }
}

/** One line per house for /llms.txt. */
export function houseLine(h: HouseView) {
  const size = `дом ${formatArea(h.area)} м²${h.mansard ? ` + мансарда ${formatArea(h.mansard)} м²` : ''}`
  const rooms = h.bedrooms ? `, ${h.bedrooms} ${plural(h.bedrooms, 'спальня', 'спальни', 'спален')}` : ''
  return `- ${h.title}, ${size}${rooms}${h.plot ? `, участок ${h.plot}` : ''}, ${formatPrice(h.price)} — ${STATUS_LABEL[h.status].toLowerCase()}: ${h.href}`
}
