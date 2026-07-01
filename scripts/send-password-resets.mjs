/**
 * After running migrate-wordpress.mjs, send "Set your password" emails
 * to all migrated users so they can log in.
 *
 * Supabase sends a magic link / password-reset email via its built-in email system.
 *
 * Usage: node scripts/send-password-resets.mjs [--limit=100] [--offset=0]
 *
 * Use --limit and --offset to send in batches if needed (recommended for 3000+ users).
 * Example:
 *   node scripts/send-password-resets.mjs --limit=200 --offset=0
 *   node scripts/send-password-resets.mjs --limit=200 --offset=200
 *   ... etc
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? true];
    })
);
const LIMIT  = parseInt(args.limit  ?? "9999");
const OFFSET = parseInt(args.offset ?? "0");
// --only=email@x.com  → send to just that one address (safe pre-launch test)
const ONLY   = (typeof args.only === "string" ? args.only : "").toLowerCase().trim();
// --delay=ms between sends (default 800ms ≈ 75/min; raise to respect a lower cap)
const DELAY  = parseInt(args.delay ?? "800");

// Reset links must point at the live site. The dev .env.local uses localhost,
// so ignore that here: prefer --site, else a non-localhost env value, else prod.
const envSite = process.env.NEXT_PUBLIC_SITE_URL;
const SITE_URL =
  (typeof args.site === "string" && args.site) ||
  (envSite && !envSite.includes("localhost") ? envSite : null) ||
  "https://drsalesdirect.com";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllAuthUsers(supabase) {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...(data.users ?? []));
    if (!data.nextPage) break;
    page++;
  }
  return all;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars in .env.local");
    process.exit(1);
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
  }

  // Service client lists users (admin); anon client triggers the actual
  // recovery email via Supabase's SMTP + "Reset Password" template.
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  console.log("Fetching all Supabase auth users...");
  const allUsers = await fetchAllAuthUsers(supabase);

  // Only target migrated users (no password set = they have no last_sign_in_at)
  // AND only users with migrated: true in metadata
  const targets = ONLY
    ? allUsers.filter((u) => u.email && u.email.toLowerCase() === ONLY)
    : allUsers
        .filter((u) => u.user_metadata?.migrated === true || u.last_sign_in_at == null)
        .filter((u) => u.email)
        .slice(OFFSET, OFFSET + LIMIT);

  if (ONLY && targets.length === 0) {
    console.error(`No account found for --only=${ONLY}. Check the address and try again.`);
    process.exit(1);
  }

  const redirectTo = `${SITE_URL}/auth/callback?next=/auth/update-password`;
  console.log(`Total users: ${allUsers.length}`);
  console.log(`Targets for reset (offset=${OFFSET}, limit=${LIMIT}): ${targets.length}`);
  console.log(`Reset link redirect: ${redirectTo}`);
  console.log(`Delay between sends: ${DELAY}ms\n`);

  let sent = 0, failed = 0, rateLimited = 0;

  for (const user of targets) {
    // resetPasswordForEmail actually sends (generateLink only *makes* a link).
    let { error } = await anon.auth.resetPasswordForEmail(user.email, { redirectTo });

    // Back off once on a rate-limit (429) and retry the same user.
    if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
      rateLimited++;
      console.warn(`  RATE-LIMITED on ${user.email} — backing off 60s…`);
      await sleep(60000);
      ({ error } = await anon.auth.resetPasswordForEmail(user.email, { redirectTo }));
    }

    if (error) {
      console.error(`  FAIL: ${user.email} — ${error.message}`);
      failed++;
    } else {
      console.log(`  SENT: ${user.email}`);
      sent++;
    }

    await sleep(DELAY);
  }

  console.log(`  (rate-limit backoffs: ${rateLimited})`);
  console.log(`
Reset emails: sent=${sent}, failed=${failed}
Done! Users can now click the email link to set their password
and access their order history.
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
