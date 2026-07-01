// Cover images for blog posts (self-hosted in /public/blog so they survive
// the domain cutover from the old WordPress site). Keyed by post slug.
const BLOG_IMAGES: Record<string, string> = {
  'eye-drop-color-chart': '/blog/blog-eye.jpg',
  'therapeutic-injections-to-relieve-joint-pain': '/blog/blog-ortho.jpg',
  'the-basics-of-dermal-fillers': '/blog/blog-filler.jpg',
  'botulinum-toxin-what-is-it-exactly': '/blog/blog-botox.jpg',
}

export function blogImage(slug: string): string | null {
  return BLOG_IMAGES[slug] ?? null
}
