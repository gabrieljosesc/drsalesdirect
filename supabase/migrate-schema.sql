-- ============================================================
-- Dr Sales Direct: schema migration (align with MedicaPlanet schema)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- ============================================================

-- 1. Drop old tables (safe in dev — no production data yet)
drop table if exists public.wishlist_items cascade;
drop table if exists public.contact_messages cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.product_images cascade;
drop table if exists public.brands cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.blog_posts cascade;
drop table if exists public.site_settings cascade;

drop type if exists public.user_role cascade;
drop type if exists public.order_status cascade;

-- 2. Extensions
create extension if not exists "pgcrypto";

-- 3. Enums
create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending_csr', 'confirmed', 'shipped', 'cancelled');

-- 4. Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  company text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  parent_id uuid references public.categories (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 6. Products (MedicaPlanet schema)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  sku text,
  variant_product_id bigint,
  base_price numeric(12, 2) not null default 0,
  price_tiers jsonb not null default '[]'::jsonb,
  currency text not null default 'USD',
  rating numeric(3, 2) not null default 4.5,
  review_count int not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_variant_product_id_key
  on public.products (variant_product_id) where variant_product_id is not null;

-- 7. Product images (separate table)
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

-- 8. Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  reference_number text unique,
  email text not null,
  full_name text not null,
  phone text,
  shipping_address jsonb not null,
  billing_address jsonb,
  payment_notes text,
  customer_notes text,
  admin_notes text,
  status public.order_status not null default 'pending_csr',
  subtotal numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null
);

-- 10. Blog posts
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null,
  published_at timestamptz,
  is_published boolean not null default false,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11. Site settings
create table public.site_settings (
  key text primary key,
  value jsonb not null
);

-- 12. Indexes
create index products_category_id_idx on public.products (category_id);
create index products_slug_idx on public.products (slug);
create index product_images_product_id_idx on public.product_images (product_id);
create index orders_user_id_idx on public.orders (user_id);
create index order_items_order_id_idx on public.order_items (order_id);

-- 13. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 14. is_admin helper (SECURITY DEFINER — no RLS recursion)
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

-- 15. RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.blog_posts enable row level security;
alter table public.site_settings enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "categories_select_all" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "products_select" on public.products
  for select using (is_active = true or public.is_admin(auth.uid()));
create policy "products_admin_write" on public.products
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "product_images_select" on public.product_images
  for select using (
    exists (select 1 from public.products pr
      where pr.id = product_id and (pr.is_active = true or public.is_admin(auth.uid())))
  );
create policy "product_images_admin_write" on public.product_images
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "orders_select" on public.orders
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "orders_insert" on public.orders
  for insert with check (true);
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin(auth.uid()));

create policy "order_items_select" on public.order_items
  for select using (
    exists (select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid())))
  );
create policy "order_items_insert" on public.order_items
  for insert with check (true);
create policy "order_items_admin_write" on public.order_items
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "blog_select" on public.blog_posts
  for select using (
    (is_published = true and published_at is not null and published_at <= now())
    or public.is_admin(auth.uid())
  );
create policy "blog_admin_write" on public.blog_posts
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "site_settings_select" on public.site_settings for select using (true);
create policy "site_settings_admin_write" on public.site_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 16. Storage bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product_images_admin_all" on storage.objects;
create policy "product_images_admin_all" on storage.objects
  for all using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

-- 17. Seed categories (same as MedicaPlanet)
insert into public.categories (slug, name, description, sort_order) values
  ('rheumatology',        'Rheumatology',           'Inflammatory and rheumatic disease therapies for specialist use.',                          10),
  ('ophthalmology',       'Ophthalmology',           'Ophthalmic preparations and related professional-use products.',                            20),
  ('skincare',            'Skincare',                'Topical and professional skincare.',                                                        30),
  ('peels-and-masks',     'Peels and Masks',         'Professional peels, masks, and resurfacing protocols.',                                     40),
  ('dermal-fillers',      'Dermal Fillers',          'Hyaluronic acid and related injectable fillers.',                                           50),
  ('botulinum-toxins',    'Botulinum Toxins',        'Neuromodulators for licensed aesthetic and therapeutic use.',                               60),
  ('gynecology',          'Gynecology',              'Gynecological and related professional products.',                                           70),
  ('body-sculpting',      'Body Sculpting',          'Body contouring and sculpting solutions for licensed practice.',                            80),
  ('osteoporosis',        'Osteoporosis',            'Osteoporosis-related injectable and adjunct therapies.',                                    90),
  ('fat-removal',         'Fat Removal',             'Lipolytic and fat-reduction technologies where licensed and indicated.',                   100),
  ('mesotherapy',         'Mesotherapy',             'Mesotherapy and skin-quality solutions.',                                                  110),
  ('orthopedic-injections','Orthopedic Injections',  'Viscosupplementation and joint-care injectables.',                                         120),
  ('dermal-filler-removal','Dermal Filler Removal',  'Hyaluronidase and related agents for filler reversal.',                                    130),
  ('anaesthetics',        'Anaesthetics',            'Local and topical anaesthetics for professional use.',                                     140),
  ('weight-loss',         'Weight Loss',             'Anti-obesity and weight-management pharmaceuticals.',                                      150),
  ('cannulas-and-needles','Cannulas and Needles',    'Cannulas, needles, and injection accessories.',                                            160),
  ('asthma',              'Asthma',                  'Respiratory therapies supplied through professional channels.',                             170),
  ('threads',             'Threads',                 'PDO and lifting threads for licensed practitioners.',                                      180),
  ('eyelash-enhancers',   'Eyelash Enhancers',       'Eyelash growth and enhancement formulations.',                                             190),
  ('prp-kits',            'PRP Kits',                'Platelet-rich plasma preparation kits and accessories.',                                   200),
  ('other',               'Other',                   'Additional professional products not mapped to a specific therapeutic area.',              999)
on conflict (slug) do nothing;

-- 18. Seed blog
insert into public.blog_posts (slug, title, excerpt, body, published_at, is_published) values
(
  'how-ordering-works',
  'How Ordering Works',
  'Orders are captured online; payment is completed offline by our team.',
  E'## CSR Workflow\n\n1. Submit your cart and checkout details.\n\n2. Order status starts as **pending review**.\n\n3. Our team contacts you within 24 hours to confirm payment and shipping.\n\nThis is standard practice in wholesale med-aesthetics.',
  now(), true
),
(
  'cold-chain-for-injectables',
  'Cold Chain Basics for Injectables',
  'Why temperature control matters during shipment.',
  E'## Cold Chain\n\nMany injectables require **refrigerated** storage. Use validated shippers and monitor manufacturer IFUs.\n\nDr Sales Direct ships to **licensed professionals**; our team may request license verification before fulfillment.',
  now(), true
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt,
  body = excluded.body, published_at = excluded.published_at,
  is_published = excluded.is_published;
