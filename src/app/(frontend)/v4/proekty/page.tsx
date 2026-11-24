import type { Metadata } from 'next'
import { getCompany, getHouses, getProjects, img, plural } from '@/lib/data'
import { cleanPhotoUrl } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { TypeList, type TypeView } from '@/v4/TypeList'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/** v4 · «Проекты» (черновик, 13.11): все проекты строками с фото, как на главной, каждый ведёт на /v4/proekt/<slug>. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Планировки и проекты кирпичных домов: от 85 до 168 м² — одноэтажные, с мансардой, двухэтажные · Хороший дом' },
  description: '15+ планировок кирпичных домов с площадями комнат и готовые дома каждого проекта в собственных посёлках.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/projects' },
}

export default async function V4Projects() {
  const [company, houses, projects] = await Promise.all([getCompany(), getHouses({ status: 'free' }), getProjects()])
  const types: TypeView[] = projects
    .map((p) => {
      const mine = houses.filter((h) => (typeof h.project === 'object' ? h.project?.id : h.project) === p.id)
      const prices = mine.map((h) => h.price ?? 0).filter((x) => x > 0)
      return {
        slug: p.slug, name: p.name, area: p.area ?? null, storeys: p.storeys ?? null, bedrooms: p.bedrooms ?? null,
        photo: cleanPhotoUrl(img(p.photo, 'wide')), thumb: cleanPhotoUrl(img(p.photo, 'card')), free: mine.length, from: prices.length ? Math.min(...prices) : null,
        href: `/v4/proekt/${p.slug}`,
      }
    })
    .filter((t) => t.photo)
    .sort((a, b) => Number(b.free > 0) - Number(a.free > 0) || (a.from ?? Infinity) - (b.from ?? Infinity))
  const areas = types.map((t) => t.area ?? 0).filter((x) => x > 0)
  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <V4PageHead eyebrow="Проекты и планировки" ghost="Проекты" title="15+ планировок:"
          em={areas.length ? `от ${Math.min(...areas).toLocaleString('ru-RU')} до ${Math.max(...areas).toLocaleString('ru-RU')} м²` : undefined}
          lead="Одноэтажные, с мансардой и двухэтажные. Строим только по своим проектам и только в своих посёлках. Наведите на строку — покажем дом." />
        <section className="v3-sec v3-sec--linen v4-sec" style={{ paddingTop: 40 }}>
          <div className="v3-wrap"><TypeList types={types} allHref="/v4/doma" allLabel="Все дома в продаже →" /></div>
        </section>
        <V4Final company={company} context="Проекты v4: запись на показ" />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
