import { notFound } from 'next/navigation'

// The site and the admin are two root layouts, so Next has no single place for a global 404 page. Every address no
// other route matches (on the main domain and, through the region rewrite, on subdomains) lands here and shows the
// site's own 404 — (frontend)/not-found.tsx — with the 404 status. Static routes (admin, api, files) win over this.
export default function Unmatched() {
  notFound()
}
