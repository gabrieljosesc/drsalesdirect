-- ============================================================
-- Dr Sales Direct — Supabase Database Schema
-- Run this in the Supabase SQL Editor (in order, top to bottom)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  first_name  text,
  last_name   text,
  company     text,
  phone       text,
  license_number text,
  role        text not null default 'customer', -- 'customer' | 'admin'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, company, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  parent_id   uuid references public.categories(id) on delete set null,
  description text,
  image_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- BRANDS
-- ============================================================
create table if not exists public.brands (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists public.products (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  slug              text not null unique,
  description       text,
  short_description text,
  price             numeric(12,2) not null default 0,
  sale_price        numeric(12,2),
  sku               text,
  stock_quantity    int,
  is_in_stock       boolean not null default true,
  category_id       uuid references public.categories(id) on delete set null,
  brand_id          uuid references public.brands(id) on delete set null,
  images            text[] not null default '{}',
  featured          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_featured_idx on public.products(featured);
create index if not exists products_name_idx on public.products using gin(to_tsvector('english', name));

-- ============================================================
-- ORDERS
-- ============================================================
create table if not exists public.orders (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete set null,
  reference_number text not null unique,
  status           text not null default 'pending',
  subtotal         numeric(12,2) not null,
  total            numeric(12,2) not null,
  shipping_address jsonb not null default '{}',
  customer_name    text,
  customer_email   text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_reference_idx on public.orders(reference_number);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create table if not exists public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,
  product_image text,
  quantity      int not null,
  unit_price    numeric(12,2) not null,
  total_price   numeric(12,2) not null
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ============================================================
-- WISHLIST ITEMS
-- ============================================================
create table if not exists public.wishlist_items (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

-- ============================================================
-- CONTACT MESSAGES
-- ============================================================
create table if not exists public.contact_messages (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BLOG POSTS
-- ============================================================
create table if not exists public.blog_posts (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  slug       text not null unique,
  excerpt    text,
  content    text not null default '',
  image_url  text,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Products (public read, admin write)
alter table public.products enable row level security;
create policy "Anyone can view products" on public.products for select using (true);
create policy "Admins can manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Categories (public read, admin write)
alter table public.categories enable row level security;
create policy "Anyone can view categories" on public.categories for select using (true);
create policy "Admins can manage categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Brands (public read, admin write)
alter table public.brands enable row level security;
create policy "Anyone can view brands" on public.brands for select using (true);
create policy "Admins can manage brands" on public.brands for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Orders (users see own, admins see all)
alter table public.orders enable row level security;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Anyone can insert order" on public.orders for insert with check (true);
create policy "Admins can manage orders" on public.orders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Order items
alter table public.order_items enable row level security;
create policy "Users can view own order items" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Anyone can insert order items" on public.order_items for insert with check (true);
create policy "Admins can manage order items" on public.order_items for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Wishlist
alter table public.wishlist_items enable row level security;
create policy "Users manage own wishlist" on public.wishlist_items for all using (auth.uid() = user_id);

-- Contact messages (insert only from public, admins can read)
alter table public.contact_messages enable row level security;
create policy "Anyone can submit contact" on public.contact_messages for insert with check (true);
create policy "Admins can read messages" on public.contact_messages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Blog posts (public read published, admin manage all)
alter table public.blog_posts enable row level security;
create policy "Anyone can view published posts" on public.blog_posts for select using (published = true);
create policy "Admins can manage blog" on public.blog_posts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- SEED: Categories
-- ============================================================
insert into public.categories (name, slug, sort_order) values
  ('Cosmetic',     'cosmetic',     1),
  ('Mesotherapy',  'mesotherapy',  2),
  ('Orthopedic',   'orthopedic',   3),
  ('Gynecology',   'gynecology',   4),
  ('Ophthalmology','ophthalmology',5),
  ('Rheumatology', 'rheumatology', 6),
  ('Other',        'other',        7)
on conflict (slug) do nothing;

-- Cosmetic sub-categories
with cosmetic as (select id from public.categories where slug = 'cosmetic')
insert into public.categories (name, slug, parent_id, sort_order) values
  ('Fillers',               'cosmetic-fillers',       (select id from cosmetic), 1),
  ('Botulinum Toxins',      'botulinum-toxins',        (select id from cosmetic), 2),
  ('Body Sculpting',        'body-sculpting',          (select id from cosmetic), 3),
  ('Eyelash Enhancers',     'eyelash-enhancers',       (select id from cosmetic), 4),
  ('Filler Removal',        'filler-removal',          (select id from cosmetic), 5),
  ('Peels & Masks',         'peels-masks',             (select id from cosmetic), 6),
  ('Professional Skin Care','professional-skin-care',  (select id from cosmetic), 7),
  ('Threads',               'threads',                 (select id from cosmetic), 8)
on conflict (slug) do nothing;

-- Other sub-categories
with other as (select id from public.categories where slug = 'other')
insert into public.categories (name, slug, parent_id, sort_order) values
  ('Anaesthetics',            'anaesthetics',            (select id from other), 1),
  ('Arthritis',               'arthritis',               (select id from other), 2),
  ('Inflammatory Bowel Disease','inflammatory-bowel-disease',(select id from other), 3),
  ('Lupus',                   'lupus',                   (select id from other), 4),
  ('Multiple Sclerosis',      'multiple-sclerosis',      (select id from other), 5),
  ('Osteoporosis',            'osteoporosis',            (select id from other), 6),
  ('PRP Kits',                'prp-kits',                (select id from other), 7),
  ('Psoriasis',               'psoriasis',               (select id from other), 8)
on conflict (slug) do nothing;

-- ============================================================
-- SEED: Brands (top brands from the live site)
-- ============================================================
insert into public.brands (name, slug) values
  ('Juvederm',     'juvederm'),
  ('Restylane',    'restylane'),
  ('Botox',        'botox'),
  ('Dysport',      'dysport'),
  ('Xeomin',       'xeomin'),
  ('Sculptra',     'sculptra'),
  ('Radiesse',     'radiesse'),
  ('Belotero',     'belotero'),
  ('Teosyal',      'teosyal'),
  ('Revolax',      'revolax'),
  ('Profhilo',     'profhilo'),
  ('Ozempic',      'ozempic'),
  ('Nordiflex',    'nordiflex'),
  ('Hyabell',      'hyabell'),
  ('Elravie',      'elravie')
on conflict (slug) do nothing;
