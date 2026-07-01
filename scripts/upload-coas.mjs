/**
 * Upload peptide COA PDFs from ./COA/ to Supabase Storage and link products.coa_url.
 *
 * Run: node scripts/upload-coas.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const peakRoot = path.join(__dirname, '..')
const coaDir = path.join(peakRoot, 'COA')

dotenv.config({ path: path.join(peakRoot, '.env.local') })

/** Filename fragment → preferred product slug (when fuzzy match is ambiguous). */
const SLUG_HINTS = [
  [/ipamorelin.*cjc|cjcnodac|cjc.*ipamorelin/i, 'cjc-1295-without-dac-5mg-ipa-5mg'],
  [/tesamorelin.*ipamorelin/i, '2x-blend-tesamorelin-10mg-ipamorelin-2mg'],
  [/wolverine|bpctb|bpc.*tb500|tb500.*bpc/i, 'wolverine-blend-bpc-157-10mg-tb500-10mg'],
  [/^glow_|_glow_/i, 'glow-bpc-157-10mg-ghk-cu-50mg-tb500-10mg'],
  [/^klow_|_klow_/i, 'klow-bpc-157-10mg-ghk-cu-50mg-tb500-10mg-kpv-10mg'],
  [/cjcwdac|cjc-1295wdac|cjc1295wdac/i, 'cjc-1295-with-dac-10mg'],
  [/igf-1.?lr3|igf1lr3/i, 'igf-1-lr3-1mg'],
  [/melanotan.?ii|melanotanii|mt-?ii/i, 'melanotan-ii-10mg'],
  [/melanotan.?i[^i]|melanotan_i/i, 'melanotan-i'],
  [/thymosin.?alpha/i, 'thymosin-alpha-1-10mg'],
  [/pt-141|pt141/i, 'pt-141-10mg'],
  [/aod.?9604|aod9604/i, 'aod-9604-5mg'],
  [/ss-31|ss31/i, 'ss-31-10mg'],
  [/kisspeptin/i, 'kisspeptin-10'],
  [/mots-c|motsc/i, 'mots-c-10mg'],
  [/foxo4|fox04/i, 'foxo4-dri'],
  [/tesofensine/i, 'tesofensine-500mcg'],
  [/cagrilintide/i, 'cagrilintide-10mg'],
  [/kpv/i, 'kpv-10mg'],
  [/epithalon/i, 'epithalon-10mg'],
  [/dsip/i, 'dsip-5mg'],
]

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function extractDoses(s) {
  const doses = []
  for (const m of String(s).matchAll(/(\d+(?:\.\d+)?)\s*(mcg|mg)/gi)) {
    doses.push({ value: m[1], unit: m[2].toLowerCase() })
  }
  return doses
}

function dosesCompatible(compound, product) {
  const dc = extractDoses(compound)
  const dt = extractDoses(`${product.title} ${product.slug}`)
  if (!dc.length || !dt.length) return true
  return dc.some(a => dt.some(b => a.value === b.value && a.unit === b.unit))
}

function parseFilename(name) {
  const base = path.basename(name, '.pdf')
  const isEndotoxin = /^Endotoxin_/i.test(base)
  const lot = parseInt(base.match(/^(\d+)_/)?.[1] ?? '0', 10)

  let compound = base
  const nova = base.match(/^\d+_NOVERA_COMPOUNDS_LLC_(.+)$/i)
  const endo = base.match(/^Endotoxin_\d+_NC_(.+)$/i)
  if (nova) compound = nova[1]
  else if (endo) compound = endo[1]

  return { compound, isEndotoxin, lot, base }
}

function slugHint(compound) {
  for (const [re, slug] of SLUG_HINTS) {
    if (re.test(compound)) return slug
  }
  return null
}

function scoreProduct(compound, product) {
  const hint = slugHint(compound)
  if (hint && product.slug === hint) return 1000

  const nc = norm(compound)
  const nt = norm(product.title)
  const ns = norm(product.slug)

  let score = 0
  if (nt && nc.includes(nt)) score += 80
  if (nt && nt.includes(nc.slice(0, Math.min(nc.length, 12)))) score += 40
  if (ns && nc.includes(ns.replace(/\d+mg/g, ''))) score += 30

  const dosesC = extractDoses(compound)
  const dosesT = extractDoses(`${product.title} ${product.slug}`)
  if (dosesC.length && dosesT.length && dosesC.some(a => dosesT.some(b => a.value === b.value && a.unit === b.unit))) {
    score += 80
  }

  // Token overlap
  const tokensC = compound.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2)
  for (const t of tokensC) {
    if (product.title.toLowerCase().includes(t)) score += 8
    if (product.slug.includes(t.replace(/ii/g, 'ii'))) score += 5
  }

  return score
}

function findBestProduct(compound, products) {
  const hint = slugHint(compound)
  if (hint) {
    const p = products.find(x => x.slug === hint)
    if (p) return { product: p, score: 1000 }
    return null
  }

  let best = null
  let bestScore = 0
  for (const p of products) {
    if (!dosesCompatible(compound, p)) continue
    const s = scoreProduct(compound, p)
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }
  if (bestScore < 40) return null
  return { product: best, score: bestScore }
}

async function ensureBucket(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  if (buckets?.some(b => b.id === 'product-coas')) return

  const { error: createErr } = await supabase.storage.createBucket('product-coas', { public: true })
  if (createErr) throw new Error(`Failed to create product-coas bucket: ${createErr.message}`)
  console.log('Created storage bucket: product-coas')
}

function coaLabel(product, parsed) {
  if (!parsed.isEndotoxin && /NOVERA/i.test(parsed.base)) {
    return `${product.title} (Novera)`
  }
  return product.title
}

function storageFileName(file) {
  return file.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function sortCoaEntries(a, b) {
  const rankA = (a.parsed.isEndotoxin ? 0 : 100) + a.parsed.lot
  const rankB = (b.parsed.isEndotoxin ? 0 : 100) + b.parsed.lot
  return rankB - rankA
}

async function hasCoaColumn(supabase) {
  const { error } = await supabase.from('products').select('coa_url').limit(1)
  return !error
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  if (!fs.existsSync(coaDir)) {
    console.error('COA folder not found:', coaDir)
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  await ensureBucket(supabase)
  const dbCoaColumn = await hasCoaColumn(supabase)
  if (!dbCoaColumn) {
    console.log('Note: products.coa_url column missing — run supabase/coa.sql in SQL Editor; using manifest fallback.')
  }

  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'peptides').single()
  if (!cat) throw new Error('Peptides category not found')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, title')
    .eq('category_id', cat.id)
    .eq('is_active', true)
  if (error) throw error

  console.log('Peptide products:', products.length)

  const files = fs.readdirSync(coaDir).filter(f => f.toLowerCase().endsWith('.pdf'))
  console.log('COA PDFs:', files.length)

  const matchesByProduct = new Map()

  for (const file of files) {
    const parsed = parseFilename(file)
    const match = findBestProduct(parsed.compound, products)
    if (!match) {
      console.log('  ? no match:', file)
      continue
    }

    const { product } = match
    const list = matchesByProduct.get(product.id) ?? []
    list.push({ file, parsed, product })
    matchesByProduct.set(product.id, list)
  }

  console.log('\nMatched products:', matchesByProduct.size)

  const manifest = {}
  let uploaded = 0
  let totalCoas = 0

  for (const entries of matchesByProduct.values()) {
    const { product } = entries[0]
    const sorted = [...entries].sort(sortCoaEntries)
    const usedLabels = new Set()
    const coas = []

    for (const { file, parsed } of sorted) {
      const storagePath = `${product.slug}/${storageFileName(file)}`
      const body = fs.readFileSync(path.join(coaDir, file))

      const { error: upErr } = await supabase.storage
        .from('product-coas')
        .upload(storagePath, body, { contentType: 'application/pdf', upsert: true })

      if (upErr) {
        console.error('Upload failed:', product.slug, upErr.message)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('product-coas').getPublicUrl(storagePath)

      let label = coaLabel(product, parsed)
      if (usedLabels.has(label)) {
        label = `${label} — ${parsed.lot || path.basename(file, '.pdf').slice(0, 24)}`
      }
      usedLabels.add(label)

      coas.push({ label, url: publicUrl })
      console.log('✓', label, '←', file)
      uploaded++
      totalCoas++
    }

    if (coas.length === 0) continue
    manifest[product.slug] = coas

    if (dbCoaColumn) {
      const { error: dbErr } = await supabase
        .from('products')
        .update({ coa_url: coas[0].url })
        .eq('id', product.id)

      if (dbErr) console.error('DB update failed:', product.slug, dbErr.message)
    }
  }

  const manifestPath = path.join(peakRoot, 'src', 'data', 'coa-manifest.json')
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Wrote manifest: ${manifestPath} (${Object.keys(manifest).length} products, ${totalCoas} COAs)`)

  console.log(`\nDone. Uploaded COAs: ${uploaded} files across ${Object.keys(manifest).length} products`)
}

main().catch(e => { console.error(e); process.exit(1) })
