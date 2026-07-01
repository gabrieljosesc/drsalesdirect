# Deploying Dr Sales Direct to Vercel

This guide takes the site live on **drsalesdirect.com**, replacing the
old WordPress site. Do the steps in order. Nothing here takes the old site
down until **Step 5** — so you can build and test on a Vercel URL first.

---

## Step 1 — Import the project into Vercel

1. Go to https://vercel.com and sign in (use "Continue with GitHub").
2. **Add New… → Project**.
3. Find and **Import** the `gabrieljosesc/drsalesdirect` repository.
4. Framework preset: **Next.js** (auto-detected). Leave build settings default.
5. **Do not deploy yet** — first add the environment variables (Step 2).

---

## Step 2 — Environment variables

In the import screen (or Project → Settings → Environment Variables), add each
of these for **Production, Preview, and Development**:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | *(your new project — Settings → API)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(from your local `.env.local`)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from your local `.env.local` — keep secret)* |
| `PAYMENT_CARD_SECRET` | *(the 64-char hex from your local `.env.local`)* |
| `NEXT_PUBLIC_SITE_URL` | `https://drsalesdirect.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | *(optional — for address autocomplete)* |

**Email (required — without these, order emails are silently skipped):**

| Name | Value |
|------|-------|
| `SMTP_HOST` | `mail.drsalesdirect.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `info@drsalesdirect.com` |
| `SMTP_PASS` | *(from your local `.env.local`)* |
| `NOTIFICATION_EMAIL` | `info@drsalesdirect.com` |
| `ADMIN_NOTIFY_EMAILS` | *(optional — extra comma-separated admin inboxes)* |
| `RESEND_API_KEY` | *(optional fallback if SMTP is not set)* |

> Copy the exact values from `C:\Users\63950\Desktop\gabby\drsalesdirect\.env.local`.
> `PAYMENT_CARD_SECRET` **must match** the local value, or saved cards can't be
> decrypted.
>
> After deploying, sign in as admin and open
> `https://drsalesdirect.com/api/email-health` — it shows whether the
> deployment can actually send email (`canSendEmail: true`).

Then click **Deploy**. Vercel builds and gives you a URL like
`drsalesdirect.vercel.app`.

---

## Step 3 — Test on the Vercel URL

Open the `*.vercel.app` URL and verify:
- Homepage, categories, products, product images
- Register / Login / a test order
- Admin panel at `/admin` (log in as `admin@drsalesdirect.com`)

---

## Step 4 — Point Supabase Auth at the production domain

In the Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://drsalesdirect.com`
- **Redirect URLs:** add
  - `https://drsalesdirect.com/**`
  - `https://drsalesdirect.vercel.app/**` (so the preview keeps working)

This makes email verification and password-reset links point to the live site.

---

## Step 5 — Connect the domain (this takes the old site down)

### 5a. Add the domain in Vercel
Project → **Settings → Domains** → add `drsalesdirect.com`
(and `www.drsalesdirect.com`). Vercel shows the exact DNS targets —
they are normally:

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

> Use whatever Vercel shows on screen — it's authoritative.

### 5b. Update DNS in Plesk
In the Plesk **DNS Settings for drsalesdirect.com** (the screen you have open):
1. Find the existing **A record** for the host (`@` / the bare domain) that
   points to the OVH server IP → **edit it** to `76.76.21.21`.
2. Find/create the **CNAME** for `www` → `cname.vercel-dns.com`.
3. Remove any conflicting old A/AAAA records for `@` and `www` that point to OVH.
4. Save / **Update** (Plesk may take a moment to apply).

> Leave **MX records (mail)** unchanged so email keeps working.

### 5c. Wait for propagation
DNS takes ~5–60 minutes. Vercel auto-issues the HTTPS certificate once it sees
the records. When the domain shows "Valid Configuration" in Vercel, the new
site is live on drsalesdirect.com and the old WordPress site is no
longer served.

---

## After launch
- Send migrated users their password-reset emails:
  `npm run migrate:resets -- --limit=200 --offset=0` (repeat in batches).
- Future pushes to the `main` branch auto-deploy to production.

## Notes
- Product images load from `medicaplanet.com` (separate domain) and from
  Supabase Storage — both unaffected by this DNS change.
- Blog images are now self-hosted in `/public/blog`, so they survive the cutover.
