import Link from 'next/link'
import type { Company } from '@/payload-types'
import { telHref } from '@/lib/format'
import { mainHref } from '@/lib/site'
import type { NavItem } from './Header'
import type { RegionView } from '@/lib/view'
import { Logo } from './Logo'

export function Footer({ company, regions, nav, current }: { company: Company; regions: RegionView[]; nav: NavItem[]; current?: RegionView }) {
  const phone = current?.phone || company.phone
  return (
    <footer className="footer">
      <div className="ornament" style={{ marginTop: -64, marginBottom: 48 }} />
      <div className="container">
        <div className="footer__grid">
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <Logo href={mainHref('/')} slogan={company.slogan} />
            <p>Строим и продаём капитальные дома для круглогодичной жизни{company.since ? ` с ${company.since} года` : ''}.</p>
          </div>
          <div>
            <p className="footer__h">Регионы</p>
            <ul>
              {regions.map((r) => (
                <li key={r.slug}>
                  <a href={r.href}>
                    {r.name}
                    {r.status === 'soon' ? ' · скоро' : ''}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="footer__h">Разделы</p>
            <ul>
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="footer__h">Связаться</p>
            <ul>
              {phone && (
                <li>
                  <a href={telHref(phone)}>{phone}</a>
                </li>
              )}
              {company.email && (
                <li>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </li>
              )}
              {company.telegram && (
                <li>
                  <a href={company.telegram} target="_blank" rel="noreferrer">
                    Telegram-канал
                  </a>
                </li>
              )}
              <li>
                <a href={mainHref('/contacts')}>Офисы продаж</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {company.legalName || `Строительная компания «${company.name}»`}.{' '}
            <a href={mainHref('/privacy')}>Политика обработки персональных данных</a> · <a href={mainHref('/consent')}>Согласие на обработку данных</a>
          </span>
          <span>Информация на сайте не является публичной офертой. Условия ипотеки определяет банк-кредитор — уточняйте у менеджера.</span>
        </div>
      </div>
    </footer>
  )
}
