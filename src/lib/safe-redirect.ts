/**
 * Returns a safe relative redirect path, or null. Prevents open redirects by
 * only allowing same-origin paths that start with a single "/".
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v.startsWith('/') || v.startsWith('//')) return null
  return v
}
