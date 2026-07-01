/**
 * Import full product catalog from MedicaPlanet source files into Dr Sales Direct.
 *
 * Reads:
 *   ../medicaplanet/Product Master File V07 10.01.24.xlsx
 *   ../medicaplanet/priceListExport.xlsx
 *   ../medicaplanet/Peptides description v2.docx   (peptides handled by seed-peptides.mjs)
 *
 * Run from drsalesdirect/: node scripts/seed-catalog.mjs
 *
 * Requires: npm install -D xlsx mammoth dotenv @supabase/supabase-js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const peakRoot = path.join(__dirname, "..");
const medicaRoot = path.join(__dirname, "..", "..", "medicaplanet");

dotenv.config({ path: path.join(peakRoot, ".env.local") });

const MASTER = path.join(medicaRoot, "Product Master File V07 10.01.24.xlsx");
const PRICES = path.join(medicaRoot, "priceListExport.xlsx");

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

const MASTER_CATEGORY_SLUG = {
  "anaesthetics": "anaesthetics",
  "asthma": "asthma",
  "body sculpting": "body-sculpting",
  "botulinum toxins": "botulinum-toxins",
  "cannulas and needles": "cannulas-and-needles",
  "dermal filler removal": "dermal-filler-removal",
  "dermal fillers": "dermal-fillers",
  "eyelash enhancers": "eyelash-enhancers",
  "fat removal": "fat-removal",
  "gynecology": "gynecology",
  "mesotherapy": "mesotherapy",
  "ophthalmology": "ophthalmology",
  "orthopedic injections": "orthopedic-injections",
  "orthopaedic injections": "orthopedic-injections",
  "osteoporosis": "osteoporosis",
  "prp kits": "prp-kits",
  "peels and masks": "peels-and-masks",
  "rheumatology": "rheumatology",
  "skincare": "skincare",
  "threads": "threads",
  "weight loss": "weight-loss",
};

function mapCategorySlug(raw) {
  const key = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (MASTER_CATEGORY_SLUG[key]) return MASTER_CATEGORY_SLUG[key];
  const fromSlug = slugify(raw);
  const KNOWN = new Set([...Object.values(MASTER_CATEGORY_SLUG), "peptides", "other"]);
  if (KNOWN.has(fromSlug)) return fromSlug;
  return "other";
}

function toMoney(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val.replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function parsePriceTiers() {
  const wb = XLSX.readFile(PRICES);
  const sheet = wb.Sheets["Sheet1"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headerRow = 4;
  const prices = new Map();
  let currentId = null;
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const id = row[0];
    if (typeof id === "number") {
      currentId = id;
      if (!prices.has(currentId)) prices.set(currentId, { tiers: [], currency: "USD" });
    }
    if (currentId == null) continue;
    const entry = prices.get(currentId);
    const p = toMoney(row[5]);
    const minQ = row[3];
    const maxQ = row[4];
    const cur = row[6];
    if (typeof cur === "string" && cur.trim()) entry.currency = cur.trim();
    if (Number.isNaN(p)) continue;
    if (typeof minQ === "number" && Number.isFinite(minQ) && typeof maxQ === "number" && Number.isFinite(maxQ)) {
      entry.tiers.push({ minQ, maxQ, price: p });
    }
  }
  const out = new Map();
  for (const [id, { tiers, currency }] of prices) {
    if (!tiers.length) continue;
    const sorted = [...tiers].sort((a, b) => a.minQ - b.minQ || a.maxQ - b.maxQ);
    out.set(id, { base: sorted[0].price, currency: currency || "USD", tiers: sorted });
  }
  return out;
}

function loadMasterRows() {
  const wb = XLSX.readFile(MASTER);
  const name = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
  const hdr = rows[1];
  const idx = (h) => hdr.indexOf(h);
  const I = {
    variantId: idx("Variant Product ID"),
    name: idx("Product Name"),
    brand: idx("Brand"),
    type: idx("Type"),
    category: idx("Category"),
    description: idx("Description"),
  };
  const out = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    const vid = row[I.variantId];
    if (typeof vid !== "number") continue;
    out.push({
      variantProductId: vid,
      title: String(row[I.name] || "").trim(),
      brand: String(row[I.brand] || "").trim(),
      type: String(row[I.type] || "").trim(),
      category: String(row[I.category] || "").trim(),
      description: String(row[I.description] || "").trim(),
    });
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: cats, error: catErr } = await supabase.from("categories").select("id, slug");
  if (catErr) throw catErr;
  const catIdBySlug = Object.fromEntries((cats || []).map((c) => [c.slug, c.id]));
  console.log("Categories loaded:", Object.keys(catIdBySlug).length);

  const priceMap = parsePriceTiers();
  console.log("Price tiers loaded for", priceMap.size, "variants");

  const master = loadMasterRows();
  console.log("Master file rows:", master.length);

  const products = [];
  const usedSlugs = new Set();

  // Skip products that should not appear
  const SKIP_SLUGS = new Set(["bronchogen"]);

  for (const row of master) {
    if (!row.title) continue;
    const catSlug = mapCategorySlug(row.category);
    // Skip peptides — handled by seed-peptides.mjs
    if (catSlug === "peptides") continue;

    const tier = priceMap.get(row.variantProductId);
    const price = tier?.base ?? 0;
    const slugBase = slugify(row.title) + "-" + row.variantProductId;
    let slug = slugBase;
    let n = 0;
    while (usedSlugs.has(slug)) { n++; slug = `${slugBase}-${n}`; }
    if (SKIP_SLUGS.has(slug)) continue;
    usedSlugs.add(slug);

    products.push({
      slug,
      title: row.title,
      description: row.description || null,
      category_id: catIdBySlug[catSlug] || catIdBySlug["other"],
      sku: `VAR-${row.variantProductId}`,
      variant_product_id: row.variantProductId,
      base_price: price,
      price_tiers: tier?.tiers ?? [],
      currency: tier?.currency || "USD",
      is_active: true,
      is_featured: false,
      rating: 4.5,
      review_count: 0,
    });
  }

  console.log("Products to upsert:", products.length);

  const BATCH = 100;
  let ok = 0, fail = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);
    const { error } = await supabase.from("products").upsert(chunk, { onConflict: "slug" });
    if (error) {
      console.error("Batch error at", i, ":", error.message);
      for (const row of chunk) {
        const { error: e2 } = await supabase.from("products").upsert(row, { onConflict: "slug" });
        if (e2) { console.error("  Row fail:", row.slug, e2.message); fail++; }
        else ok++;
      }
    } else {
      ok += chunk.length;
    }
  }

  console.log(`Done. OK: ${ok}, Failed: ${fail}`);
  console.log("Next step: run  node scripts/seed-peptides.mjs  for peptides");
  console.log("Then run: node scripts/upload-images.mjs  to attach product images");
}

main().catch((e) => { console.error(e); process.exit(1); });
