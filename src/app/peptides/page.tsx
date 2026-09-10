import { redirect } from 'next/navigation'

/**
 * The client wants ONE peptides page: the main-nav "Peptides" link and
 * Products → Peptides both go to /shop/peptides (the category page with the
 * banner image). This old landing page redirects so existing links keep
 * working. (2026-09-11 client feedback: the two entry points opened two
 * different-looking pages.)
 */
export default function PeptidesPage() {
  redirect('/shop/peptides')
}
