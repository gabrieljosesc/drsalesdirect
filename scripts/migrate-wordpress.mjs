/**
 * WordPress → Supabase Migration
 * Migrates: 3,061 users (profiles) + 469 orders + order items
 *
 * Usage (from drsalesdirect/):
 *   node scripts/migrate-wordpress.mjs [users.csv] [orders.csv] [items.csv]
 *
 * Defaults to C:\Users\63950\Downloads\ for CSV paths.
 *
 * What it does:
 *  1. Loads all existing Supabase auth users (to skip duplicates)
 *  2. Creates new auth accounts for each WP user (email_confirm=true)
 *  3. Upserts profiles (name, phone, company)
 *  4. Creates orders (linked to Supabase user ID where possible)
 *  5. Creates order items (unit_price = line_subtotal / qty)
 *
 * Passwords: WordPress phpass cannot be imported into Supabase.
 *   After migration, run: node scripts/send-password-resets.mjs
 *   to email users a "set your password" link.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

// ── CSV paths ──────────────────────────────────────────────────────────────
const DOWNLOADS = "C:\\Users\\63950\\Downloads";
const USERS_CSV  = process.argv[2] || path.join(DOWNLOADS, "wp_users.csv");
const ORDERS_CSV = process.argv[3] || path.join(DOWNLOADS, "wp_posts.csv");
const ITEMS_CSV  = process.argv[4] || path.join(DOWNLOADS, "wp_woocommerce_order_items.csv");

// Emails to skip (admin / developer accounts)
const SKIP_EMAILS = new Set([
  "info@drsalesdirect.com",
  "ramosarnoldph@gmail.com",
  "radiogagadesign@gmail.com",
]);

// ── WooCommerce → Supabase status map ─────────────────────────────────────
function mapStatus(s) {
  return (
    {
      "wc-completed":  "confirmed",
      "wc-processing": "pending_csr",
      "wc-on-hold":    "pending_csr",
      "wc-pending":    "pending_csr",
      "wc-failed":     "cancelled",
      "wc-cancelled":  "cancelled",
      "wc-refunded":   "cancelled",
    }[s] ?? "pending_csr"
  );
}

// ── Tiny CSV parser ────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (!vals.length) continue;
    const row = {};
    headers.forEach((h, idx) => {
      const v = vals[idx];
      row[h] = v === undefined || v === "NULL" ? null : v;
    });
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === "," && !q) {
      out.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Fetch ALL existing Supabase auth users (paginated) ────────────────────
async function fetchAllAuthUsers(supabase) {
  const all = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...(data.users ?? []));
    if (!data.nextPage) break;
    page++;
  }
  return all;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  for (const f of [USERS_CSV, ORDERS_CSV, ITEMS_CSV]) {
    if (!fs.existsSync(f)) { console.error("File not found:", f); process.exit(1); }
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // ── Parse CSVs ───────────────────────────────────────────────────────
  console.log("Reading CSV files...");
  const wpUsers  = parseCSV(USERS_CSV);
  const wpOrders = parseCSV(ORDERS_CSV);
  const wpItems  = parseCSV(ITEMS_CSV);
  console.log(`  WP users: ${wpUsers.length}, Orders: ${wpOrders.length}, Items: ${wpItems.length}`);

  // ── Step 1: Fetch existing Supabase users ─────────────────────────────
  console.log("\nFetching existing Supabase auth users...");
  const existingUsers = await fetchAllAuthUsers(supabase);
  const existingByEmail = new Map(existingUsers.map((u) => [u.email?.toLowerCase(), u.id]));
  console.log(`  Found ${existingUsers.length} existing users in Supabase`);

  // ── Step 2: Create / map users ────────────────────────────────────────
  console.log("\n--- Migrating users ---");
  // wp_user_id (string) → supabase_user_id
  const wpIdToSbId  = new Map();
  // email (lowercase) → supabase_user_id (for order linking)
  const emailToSbId = new Map(existingByEmail);

  let created = 0, skipped = 0, failed = 0;

  for (const u of wpUsers) {
    const email = (u.user_email ?? "").toLowerCase().trim();
    if (!email) { skipped++; continue; }
    if (SKIP_EMAILS.has(email)) {
      console.log(`  SKIP (admin): ${email}`);
      skipped++;
      continue;
    }

    const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || null;

    if (existingByEmail.has(email)) {
      // Already in Supabase — just upsert profile
      const sbId = existingByEmail.get(email);
      wpIdToSbId.set(u.ID, sbId);
      emailToSbId.set(email, sbId);

      await supabase.from("profiles").upsert({
        id: sbId,
        email: u.user_email,
        full_name: fullName,
        phone: u.phone || null,
        company: u.company || null,
        role: "customer",
      }, { onConflict: "id" });

      console.log(`  EXISTS: ${email}`);
      skipped++;
      continue;
    }

    // Create new auth user (no password — user must set via reset link)
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.user_email,
      email_confirm: true,      // treat as verified (they confirmed on old site)
      user_metadata: {
        full_name: fullName,
        wp_user_id: u.ID,
        migrated: true,
      },
    });

    if (error) {
      console.error(`  FAIL: ${email} — ${error.message}`);
      failed++;
      await sleep(500); // back off on error
      continue;
    }

    const sbId = data.user.id;
    wpIdToSbId.set(u.ID, sbId);
    emailToSbId.set(email, sbId);

    // Upsert profile
    await supabase.from("profiles").upsert({
      id: sbId,
      email: u.user_email,
      full_name: fullName,
      phone: u.phone || null,
      company: u.company || null,
      role: "customer",
    }, { onConflict: "id" });

    console.log(`  OK: ${email} (${fullName ?? "no name"})`);
    created++;
    await sleep(80); // ~12 users/sec — well within Supabase limits
  }

  console.log(`\nUsers: created=${created}, skipped/existed=${skipped}, failed=${failed}`);

  // ── Step 3: Build order-items lookup ─────────────────────────────────
  const itemsByOrderId = new Map();
  for (const item of wpItems) {
    const oid = item.order_id;
    if (!itemsByOrderId.has(oid)) itemsByOrderId.set(oid, []);
    itemsByOrderId.get(oid).push(item);
  }

  // ── Step 4: Migrate orders ────────────────────────────────────────────
  console.log("\n--- Migrating orders ---");
  let ordersOk = 0, ordersFail = 0;

  for (const order of wpOrders) {
    // Resolve Supabase user ID from email (preferred) or wp_customer_id
    const email = (order.email ?? "").toLowerCase().trim();
    let sbUserId =
      emailToSbId.get(email) ??
      wpIdToSbId.get(order.wp_customer_id) ??
      null;

    const subtotal = parseFloat(order.total) || 0;
    const refNum   = `WP-${order.order_id}`;

    // Check if already migrated (idempotent)
    const { data: exists } = await supabase
      .from("orders")
      .select("id")
      .eq("reference_number", refNum)
      .maybeSingle();

    if (exists) {
      console.log(`  EXISTS: ${refNum}`);
      ordersOk++;
      continue;
    }

    const { data: newOrder, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id:     sbUserId,
        reference_number: refNum,
        status:      mapStatus(order.status),
        subtotal,
        email:       order.email || "",
        full_name:   `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim(),
        phone:       order.phone || null,
        shipping_address: {
          first_name:   order.first_name  ?? "",
          last_name:    order.last_name   ?? "",
          company:      order.company     ?? "",
          address_line1: order.address_1  ?? "",
          address_line2: order.address_2  ?? "",
          city:         order.city        ?? "",
          state:        order.state       ?? "",
          zip:          order.zip         ?? "",
          country:      order.country     ?? "",
          phone:        order.phone       ?? "",
        },
        customer_notes: order.notes || null,
        created_at: order.created_at,   // preserve original order date
      })
      .select("id")
      .single();

    if (oErr) {
      console.error(`  FAIL: ${refNum} — ${oErr.message}`);
      ordersFail++;
      continue;
    }

    // Insert order items
    const lineItems = itemsByOrderId.get(order.order_id) ?? [];
    for (const item of lineItems) {
      const qty       = Math.max(1, parseInt(item.quantity) || 1);
      const lineTotal = parseFloat(item.unit_price) || 0;
      const unitPrice = parseFloat((lineTotal / qty).toFixed(2));

      await supabase.from("order_items").insert({
        order_id:   newOrder.id,
        product_id: null,           // historical products don't exist in new catalogue
        title:      item.product_title,
        quantity:   qty,
        unit_price: unitPrice,
      });
    }

    console.log(`  OK: ${refNum} (${order.email}) — ${lineItems.length} item(s) — $${subtotal}`);
    ordersOk++;
  }

  console.log(`\nOrders: ok=${ordersOk}, failed=${ordersFail}`);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`
═══════════════════════════════════════════════
 Migration complete!
═══════════════════════════════════════════════
 Users created : ${created}
 Users existed : ${skipped}
 Users failed  : ${failed}
 Orders done   : ${ordersOk}
 Orders failed : ${ordersFail}

 NEXT STEP — send password reset emails:
   node scripts/send-password-resets.mjs

 Users will receive a "Set your password" link
 and can log in to see their full order history.
═══════════════════════════════════════════════
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
