# Dr Sales Direct — Local Setup

A Next.js 16 + Supabase wholesale storefront. Same feature set as Peak Medical
Wholesale (registration, login, profiles, cart, checkout, orders, admin panel,
blog), rebranded for **drsalesdirect.com** with a fresh minimal design.

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to https://supabase.com → **New project**. Pick a name (e.g. `drsalesdirect`)
   and a strong database password.
2. When it finishes provisioning, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (secret)

## 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the Supabase values above. Generate `PAYMENT_CARD_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Email/SMTP and Google Maps keys are optional for local development.

## 4. Create the database

Open the Supabase **SQL Editor → New query**, paste the entire contents of
[`supabase/setup.sql`](supabase/setup.sql), and **Run**. This creates every
table, RLS policy, storage bucket, the auto-profile trigger, and seeds all
product **categories** and starter blog posts in one pass.

> The individual files in `supabase/` are the source migrations; `setup.sql`
> is just all of them concatenated in the correct order for a fresh project.

## 5. Create an admin user

```bash
npm run create:admin admin@drsalesdirect.com "your-password"
```

Then sign in at `/auth/login` and open `/admin`.

## 6. Run

```bash
npm run dev
```

Open http://localhost:3000.

- **Categories show without logging in** — the navbar, homepage, and shop fetch
  categories with the Supabase service-role (admin) client on the server, which
  bypasses RLS, so anonymous visitors see the full catalog navigation. (This was
  the bug on the old WordPress site.)

## 7. Add products

Categories are seeded, but products are not. Two options:

- **Admin panel:** `/admin/products → New` to add products, prices, and images.
- **Bulk seed scripts** (`scripts/seed-*.mjs`) exist from the Peak Medical build;
  they pull from external catalog sources and may need adjusting for your data.

## Going live

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for deploying to Vercel and pointing the
`drsalesdirect.com` domain. Update the Supabase Auth **Site URL** and **Redirect
URLs** to your production domain (Authentication → URL Configuration).
