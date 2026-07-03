/**
 * Canonical public site URL, used by sitemap/robots/metadata.
 * Strips any accidental inline comment/whitespace from the env value and
 * falls back to the production domain if it's unset or a dev/localhost value.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().split(/\s+/)[0] ?? ''
  if (raw && !raw.includes('localhost') && raw.startsWith('http')) {
    return raw.replace(/\/$/, '')
  }
  return 'https://drsalesdirect.com'
}
