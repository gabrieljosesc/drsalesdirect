/**
 * Upload product images from MedicaPlanet images folder to Dr Sales Direct Supabase Storage.
 *
 * Source: ../medicaplanet/images/  (929 local image files)
 * Target: Supabase Storage bucket "product-images"
 * Maps:   image filename → product slug by fuzzy matching
 *
 * Run from drsalesdirect/: node scripts/upload-images.mjs
 *
 * Requires: npm install -D dotenv @supabase/supabase-js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const peakRoot = path.join(__dirname, "..");
const imagesDir = path.join(__dirname, "..", "..", "medicaplanet", "images");

dotenv.config({ path: path.join(peakRoot, ".env.local") });

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function contentType(ext) {
  const e = ext.toLowerCase();
  if (e === ".webp") return "image/webp";
  if (e === ".png") return "image/png";
  if (e === ".gif") return "image/gif";
  return "image/jpeg";
}

function normForMatch(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/**
 * Given an image base name (without extension) and list of product {slug, variant_product_id},
 * try to find the best product match.
 *
 * Strategy:
 * 1. Extract variant ID from end of filename (e.g. "BOTOX-100U-12345" → 12345)
 * 2. Exact variant_product_id match
 * 3. Normalized slug prefix match
 */
function findBestSlug(base, products) {
  // Try extracting trailing number as variant ID
  const trailNum = base.match(/-(\d{4,})(?:-\d+)?$/);
  if (trailNum) {
    const vid = parseInt(trailNum[1], 10);
    const byVid = products.find(p => p.variant_product_id === vid);
    if (byVid) return byVid.slug;
  }

  // Normalize base for slug matching
  const normBase = normForMatch(base.replace(/-0*[1-9]\d?$/, "")); // strip trailing -01, -02 etc.

  // Try exact slug match
  for (const p of products) {
    const normSlug = normForMatch(p.slug.replace(/-\d+$/, "")); // strip variant suffix from slug
    if (normBase === normSlug) return p.slug;
  }

  // Try prefix / substring match (base contains slug or vice versa)
  let best = null;
  let bestLen = 0;
  for (const p of products) {
    const normSlug = normForMatch(p.slug.replace(/-\d+$/, ""));
    if (normSlug.length < 4) continue;
    if (normBase.includes(normSlug) || normSlug.includes(normBase)) {
      if (normSlug.length > bestLen) {
        bestLen = normSlug.length;
        best = p.slug;
      }
    }
  }
  return best;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  if (!fs.existsSync(imagesDir)) {
    console.error("Images directory not found:", imagesDir);
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Load all products
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, variant_product_id")
    .eq("is_active", true);
  if (error) throw error;
  console.log("Products in DB:", products.length);

  // Load image files, sort so -01 (hero) comes first
  const files = fs.readdirSync(imagesDir)
    .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .sort()
    .map(name => ({
      name,
      base: path.basename(name, path.extname(name)),
      ext: path.extname(name).toLowerCase(),
      fullPath: path.join(imagesDir, name),
    }));

  console.log("Image files found:", files.length);

  const heroAssigned = new Set(); // slugs that already have a hero
  let uploaded = 0, skipped = 0;

  for (const file of files) {
    const slug = findBestSlug(file.base, products);
    if (!slug) {
      // console.log("No match:", file.name);
      skipped++;
      continue;
    }

    // Only assign hero (sort_order 0) if not already set
    if (heroAssigned.has(slug)) {
      skipped++;
      continue;
    }

    const product = products.find(p => p.slug === slug);
    if (!product) { skipped++; continue; }

    const storagePath = `${slug}/hero${file.ext}`;
    const body = fs.readFileSync(file.fullPath);

    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(storagePath, body, { contentType: contentType(file.ext), upsert: true });

    if (upErr) {
      console.error("Upload failed:", file.name, upErr.message);
      skipped++;
      continue;
    }

    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(storagePath);

    // Upsert product_images row
    const { data: existing } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", product.id)
      .eq("sort_order", 0)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("product_images").update({ url: publicUrl }).eq("id", existing.id);
    } else {
      await supabase.from("product_images").insert({ product_id: product.id, url: publicUrl, sort_order: 0 });
    }

    heroAssigned.add(slug);
    console.log("✓", slug, "←", file.name);
    uploaded++;
  }

  console.log(`\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
