// Server-safe blog HTML processing: inject anchor ids into h2/h3 headings and
// extract a table of contents. Pure string ops (no DOM) so it runs in RSC.

export type TocEntry = { id: string; text: string; level: 2 | 3 }

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#8217;|&#039;|&#39;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Returns the body with `id` attributes on every h2/h3 plus the extracted TOC.
 * IDs are de-duplicated so anchor links always resolve.
 */
export function processBlogHtml(body: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = []
  const seen = new Map<string, number>()

  const html = String(body || '').replace(
    /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (_match, levelStr: string, attrs: string | undefined, inner: string) => {
      const level = Number(levelStr) as 2 | 3
      const text = stripTags(inner)
      if (!text) return `<h${level}${attrs ?? ''}>${inner}</h${level}>`
      let id = slugify(text) || `section-${toc.length + 1}`
      const n = seen.get(id) ?? 0
      seen.set(id, n + 1)
      if (n > 0) id = `${id}-${n}`
      // drop any existing id in attrs, then add ours
      const cleanAttrs = (attrs ?? '').replace(/\sid=(["']).*?\1/gi, '')
      toc.push({ id, text, level })
      return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`
    }
  )

  return { html, toc }
}
