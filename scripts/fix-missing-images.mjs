/**
 * Fix missing product images — improved word-overlap matching.
 *
 * For products that have NO image yet, tries to match local image files
 * against product TITLES (not slugs) using word-overlap scoring.
 *
 * Run: node scripts/fix-missing-images.mjs
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const peakRoot  = path.join(__dirname, "..");
const imagesDir = path.join(__dirname, "..", "..", "medicaplanet", "images");

dotenv.config({ path: path.join(peakRoot, ".env.local") });

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Words that appear in filenames but add no matching value
const STOP_WORDS = new Set([
  "01","02","03","04","05","and","with","for","non","english","international",
  "ml","mg","u","iu","ug","mcg","x","plus","1x1","2x1","the","a","in","of",
  "allergan","abbvie","pfizer","galderma","merz","sinclair","sincalir",
  "czech","greek","turkish","korean","polish","bulgarian","dutch","romanian",
  "slovakian","arabic","german","spanish","french","italian","portuguese",
  "uk","us","ca","eu",
]);

function contentType(ext) {
  if (ext === ".webp") return "image/webp";
  if (ext === ".png")  return "image/png";
  return "image/jpeg";
}

/** Tokenize: lowercase, remove non-alpha-numeric, split, remove stop words */
function tokenize(s) {
  return s
    .toLowerCase()
    .replace(/[®™%+]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Score how well a set of image tokens matches a product title.
 * Returns 0–1. Threshold for a match: >= 0.55
 */
function overlapScore(imgTokens, titleTokens) {
  if (!imgTokens.length || !titleTokens.length) return 0;
  const titleSet = new Set(titleTokens);
  const hits = imgTokens.filter(t => titleSet.has(t)).length;
  // Jaccard-like: hits / union
  const union = new Set([...imgTokens, ...titleTokens]).size;
  return hits / union;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // ── 1. Fetch products that have NO image yet ───────────────────────────
  const { data: allProducts } = await supabase
    .from("products")
    .select("id, slug, title, variant_product_id")
    .eq("is_active", true);

  const { data: existingImages } = await supabase
    .from("product_images")
    .select("product_id");

  const hasImage = new Set((existingImages ?? []).map(i => i.product_id));
  const needsImage = (allProducts ?? []).filter(p => !hasImage.has(p.id));

  console.log(`Total products: ${(allProducts ?? []).length}`);
  console.log(`Already have image: ${hasImage.size}`);
  console.log(`Need image: ${needsImage.length}`);

  if (!needsImage.length) {
    console.log("All products already have images. Nothing to do.");
    return;
  }

  // Pre-tokenize all product titles
  const productTokens = needsImage.map(p => ({
    ...p,
    tokens: tokenize(p.title),
  }));

  // ── 2. Load image files ────────────────────────────────────────────────
  const files = fs.readdirSync(imagesDir)
    .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .sort()
    .map(name => {
      const ext  = path.extname(name).toLowerCase();
      const base = path.basename(name, ext);
      // Only keep -01 (hero) files; skip -02, -03, -04
      const isHero = /[-_]0*1$/.test(base);
      return { name, base, ext, isHero, fullPath: path.join(imagesDir, name) };
    })
    .filter(f => f.isHero);

  console.log(`Hero image files to try: ${files.length}\n`);

  // ── 3. Match & upload ─────────────────────────────────────────────────
  const THRESHOLD = 0.45;
  let uploaded = 0, noMatch = 0;

  for (const file of files) {
    const imgTokens = tokenize(file.base);

    // Score against every product that needs an image
    let bestScore = 0;
    let bestProduct = null;

    for (const p of productTokens) {
      const score = overlapScore(imgTokens, p.tokens);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = p;
      }
    }

    if (bestScore < THRESHOLD || !bestProduct) {
      // console.log(`  NO MATCH (${bestScore.toFixed(2)}): ${file.name}`);
      noMatch++;
      continue;
    }

    // Upload to Supabase Storage
    const storagePath = `${bestProduct.slug}/hero${file.ext}`;
    const body = fs.readFileSync(file.fullPath);

    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(storagePath, body, { contentType: contentType(file.ext), upsert: true });

    if (upErr) {
      console.error(`  Upload fail: ${file.name} → ${bestProduct.slug}: ${upErr.message}`);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(storagePath);

    await supabase.from("product_images").insert({
      product_id: bestProduct.id,
      url: publicUrl,
      sort_order: 0,
    });

    // Remove from needsImage so it won't be matched again
    const idx = productTokens.indexOf(bestProduct);
    if (idx > -1) productTokens.splice(idx, 1);

    console.log(`  ✓ (${bestScore.toFixed(2)}) ${bestProduct.slug}`);
    console.log(`       ← ${file.name}`);
    uploaded++;
  }

  console.log(`\nDone. Newly uploaded: ${uploaded}, No match found: ${noMatch}`);

  // ── 4. Report still-missing ───────────────────────────────────────────
  if (productTokens.length > 0) {
    console.log(`\nProducts still without images (${productTokens.length}):`);
    productTokens.slice(0, 30).forEach(p => console.log(`  - ${p.slug}`));
    if (productTokens.length > 30) console.log(`  ... and ${productTokens.length - 30} more`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
