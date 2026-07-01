/**
 * Import peptides into Dr Sales Direct.
 *
 * Reads peptide titles/descriptions from:
 *   ../medicaplanet/Peptides description v2.docx
 *
 * Pricing: matches against PureChainResearch.com WooCommerce Store API.
 * Wholesale overrides from: ../medicaplanet/web/data/peptide-wholesale-pricing.json
 * Image overrides from:     ../medicaplanet/web/data/purechain-peptides-overrides.json
 *
 * Run from drsalesdirect/: node scripts/seed-peptides.mjs
 *
 * Requires: npm install -D mammoth dotenv @supabase/supabase-js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import mammoth from "mammoth";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const peakRoot = path.join(__dirname, "..");
const medicaRoot = path.join(__dirname, "..", "..", "medicaplanet");
const medicaWebRoot = path.join(medicaRoot, "web");

dotenv.config({ path: path.join(peakRoot, ".env.local") });

const PEPTIDES_DOCX = path.join(medicaRoot, "Peptides description v2.docx");
const WHOLESALE_PRICE_PATH = path.join(medicaWebRoot, "data", "peptide-wholesale-pricing.json");
const OVERRIDES_PATH = path.join(medicaWebRoot, "data", "purechain-peptides-overrides.json");

const PURECHAIN_STORE =
  "https://purechainresearch.com/wp-json/wc/store/v1/products?category=63&per_page=100&orderby=title&order=asc";

// Products that must NOT be imported
const SKIP_SLUGS = new Set(["bronchogen"]);

function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/®|™/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function normKey(s) {
  return s.toLowerCase()
    .replace(/[""'']/g, '"')
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function stripHtml(h) {
  if (!h) return "";
  return String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function storePriceDollars(p) {
  const u = p.prices?.currency_minor_unit ?? 2;
  return Number(p.prices?.price ?? 0) / 10 ** Number(u);
}

function pickImageUrl(p) {
  const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : null;
  if (!img) return null;
  return (img.thumbnail && String(img.thumbnail)) || (img.src && String(img.src)) || null;
}

function findStoreByTitle(want, store) {
  const a = normKey(want);
  for (const p of store) if (normKey(p.name) === a) return p;
  for (const p of store) {
    if (a && (normKey(p.name).includes(a) || a.includes(normKey(p.name)))) return p;
  }
  return null;
}

async function parsePeptidesDocx() {
  const buf = fs.readFileSync(PEPTIDES_DOCX);
  const { value } = await mammoth.extractRawText({ buffer: buf });
  const blocks = value.split(/\n{3,}/).map(b => b.trim()).filter(Boolean);
  const items = [];
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const title = lines[0].replace(/\s*\([^)]*\)\s*$/, "").trim();
    const body = lines.slice(1).join("\n\n").trim();
    if (!title || title.length > 200) continue;
    items.push({ title, body: body || block });
  }
  return items;
}

function loadWholesalePricing() {
  if (!fs.existsSync(WHOLESALE_PRICE_PATH)) return { prices: {}, slugAliases: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(WHOLESALE_PRICE_PATH, "utf8"));
    return {
      prices: raw.prices && typeof raw.prices === "object" ? raw.prices : {},
      slugAliases: raw.slugAliases && typeof raw.slugAliases === "object" ? raw.slugAliases : {},
    };
  } catch { return { prices: {}, slugAliases: {} }; }
}

function resolveWholesalePrice(slug, wholesale) {
  const viaAlias = wholesale.slugAliases?.[slug];
  const keysToTry = viaAlias ? [viaAlias, slug] : [slug];
  for (const k of keysToTry) {
    const p = wholesale.prices?.[k];
    if (typeof p === "number" && p >= 0) return p;
  }
  return null;
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("_")) continue;
      if (v && typeof v === "object") out[k] = v;
    }
    return out;
  } catch { return {}; }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  if (!fs.existsSync(PEPTIDES_DOCX)) {
    console.error("Peptides docx not found at:", PEPTIDES_DOCX);
    process.exit(1);
  }

  console.log("Fetching PureChainResearch store API...");
  const res = await fetch(PURECHAIN_STORE, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.error("PureChainResearch API error:", res.status);
    process.exit(1);
  }
  const store = await res.json();
  console.log("PureChainResearch products fetched:", store.length);

  const overrides = loadOverrides();

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: cat, error: catErr } = await supabase
    .from("categories").select("id").eq("slug", "peptides").single();
  if (catErr || !cat) {
    console.error("peptides category not found — run migrate-schema.sql first");
    process.exit(1);
  }
  const catId = cat.id;

  const docx = await parsePeptidesDocx();
  console.log("Peptides from docx:", docx.length);

  const usedSlugs = new Set();
  const rows = [];

  for (const item of docx) {
    const match = findStoreByTitle(item.title, store);
    const baseSlug = match ? String(match.slug) : slugify(item.title);
    if (SKIP_SLUGS.has(baseSlug) || SKIP_SLUGS.has(slugify(item.title))) continue;

    let slug = baseSlug;
    let n = 0;
    while (usedSlugs.has(slug)) { n++; slug = `${baseSlug}-${n}`; }
    usedSlugs.add(slug);

    // Price: live PureChainResearch.com store price (authoritative for peptides)
    let price = match ? storePriceDollars(match) : 0;
    let imageUrl = match ? pickImageUrl(match) : null;

    // Manual overrides only FILL GAPS when the API has no match (still purechain-derived)
    const ov = overrides[slug];
    if (ov) {
      if (typeof ov.price === "number" && ov.price > 0 && (!price || price === 0)) price = ov.price;
      if (typeof ov.imageUrl === "string" && ov.imageUrl.trim() && !imageUrl) imageUrl = ov.imageUrl.trim();
    }

    if (!item.body?.trim() && match?.description) {
      item.body = stripHtml(match.description).slice(0, 4000) || "Research use only.";
    }

    rows.push({ slug, title: item.title.trim(), description: item.body?.trim() || "Research use only.", price, imageUrl });
  }

  console.log("Peptides to upsert:", rows.length);
  let ok = 0, noPrice = 0, noImg = 0;

  for (const row of rows) {
    const { data: product, error: uErr } = await supabase
      .from("products")
      .upsert({
        slug: row.slug,
        title: row.title,
        description: row.description,
        category_id: catId,
        sku: `PCH-${row.slug}`.slice(0, 64),
        variant_product_id: null,
        base_price: row.price,
        price_tiers: [],
        currency: "USD",
        is_active: true,
        is_featured: false,
        rating: 4.5,
        review_count: 0,
      }, { onConflict: "slug" })
      .select("id")
      .single();

    if (uErr || !product) {
      console.error("Upsert error:", row.slug, uErr?.message);
      continue;
    }

    // Update product_images
    await supabase.from("product_images").delete().eq("product_id", product.id);
    if (row.imageUrl) {
      await supabase.from("product_images").insert({
        product_id: product.id,
        url: row.imageUrl,
        sort_order: 0,
      });
    } else {
      noImg++;
    }

    if (!row.price || row.price === 0) noPrice++;
    else ok++;

    console.log(
      row.price > 0 ? "✓" : "?",
      row.slug,
      row.price > 0 ? `$${row.price}` : "no price",
      row.imageUrl ? "" : "(no image)"
    );
  }

  console.log(`\nDone. Priced: ${ok}, No price: ${noPrice}, No image: ${noImg}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
