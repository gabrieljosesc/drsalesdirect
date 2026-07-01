/**
 * CDN fallback for products still without images.
 * For each product without an image, constructs candidate medicaplanet.com
 * URLs from the product title and tests them with a HEAD request.
 * If found, inserts the URL directly into product_images (no upload needed).
 *
 * Run: node scripts/fix-images-cdn-fallback.mjs
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const CDN = "https://medicaplanet.com/images";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Convert a product title to candidate image filenames */
function candidateFilenames(title) {
  const base = title
    .toUpperCase()
    .replace(/[®™]/g, "")
    .replace(/[×]/g, "X")
    .replace(/\s*\([^)]*\)/g, "")   // remove parenthetical e.g. (Non-English)
    .replace(/[^A-Z0-9\s.%+]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  // Try both -01 and -1 suffix variants, and .jpg / .png
  const candidates = []
  for (const suffix of ["-01", "-1", ""]) {
    for (const ext of [".jpg", ".png"]) {
      candidates.push(`${base}${suffix}${ext}`)
    }
  }
  return candidates
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Products without images
  const { data: allProducts } = await supabase
    .from("products").select("id, slug, title").eq("is_active", true);
  const { data: existingImages } = await supabase
    .from("product_images").select("product_id");

  const hasImage = new Set((existingImages ?? []).map(i => i.product_id));
  const needsImage = (allProducts ?? []).filter(p => !hasImage.has(p.id));

  console.log(`Products still without image: ${needsImage.length}\n`);

  let found = 0, notFound = 0;

  for (const product of needsImage) {
    const candidates = candidateFilenames(product.title);
    let matched = null;

    for (const filename of candidates) {
      const testUrl = `${CDN}/${filename}`;
      if (await urlExists(testUrl)) {
        matched = testUrl;
        break;
      }
      await sleep(80); // be polite to their server
    }

    if (matched) {
      const { error } = await supabase.from("product_images").insert({
        product_id: product.id,
        url: matched,
        sort_order: 0,
      });
      if (error) {
        console.error(`  DB error for ${product.slug}: ${error.message}`);
      } else {
        console.log(`  ✓ ${product.slug}`);
        console.log(`      → ${matched}`);
        found++;
      }
    } else {
      console.log(`  ✗ ${product.slug} (no CDN match)`);
      notFound++;
    }

    await sleep(50);
  }

  console.log(`\nDone. Found on CDN: ${found}, Not found: ${notFound}`);
  if (notFound > 0) {
    console.log("Remaining products without images will show a placeholder until images are added manually via the admin panel.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
