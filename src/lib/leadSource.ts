/**
 * One line for the manager (and later for the CRM): where the lead came from.
 * Ads by their UTM tags or click ids, then search engines and other sites by the referrer, else a direct visit.
 * `ownHost` — the site's root domain: moving between our own subdomains is not a source.
 */
export function leadSource(utm: Record<string, string>, ref: string, ownHost: string): string {
  if (utm.utm_source) {
    const extra = [utm.utm_medium, utm.utm_campaign].filter(Boolean).join(' / ')
    return `Реклама: ${utm.utm_source}${extra ? ` (${extra})` : ''}`
  }
  if (utm.yclid) return 'Реклама: Яндекс Директ'
  if (utm.gclid) return 'Реклама: Google Ads'
  let host = ''
  try {
    host = ref ? new URL(ref).host.toLowerCase() : ''
  } catch {
    host = ''
  }
  const own = ownHost.toLowerCase()
  if (!host || host === own || host.endsWith(`.${own}`)) return 'Прямой заход'
  const bare = host.replace(/^www\./, '')
  if (/(^|\.)yandex\.\w+$|(^|\.)ya\.ru$/.test(bare)) return 'Поиск Яндекса'
  if (/(^|\.)google\.\w+(\.\w+)?$/.test(bare)) return 'Поиск Google'
  return `Переход с ${bare}`
}
