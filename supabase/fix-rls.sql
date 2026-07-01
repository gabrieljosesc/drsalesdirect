-- ============================================================
-- RLS Fix — Dr Sales Direct
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- ============================================================

-- 1. Drop all existing policies that cause infinite recursion
drop policy if exists "Admins can view all profiles"   on public.profiles;
drop policy if exists "Admins can manage products"     on public.products;
drop policy if exists "Admins can manage categories"   on public.categories;
drop policy if exists "Admins can manage brands"       on public.brands;
drop policy if exists "Admins can manage orders"       on public.orders;
drop policy if exists "Admins can manage order items"  on public.order_items;
drop policy if exists "Admins can read messages"       on public.contact_messages;
drop policy if exists "Admins can manage blog"         on public.blog_posts;

-- 2. Create a SECURITY DEFINER function to check admin role
--    (bypasses RLS so it never recurses)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 3. Re-create policies using the safe is_admin() function

-- Profiles
create policy "Admins can manage all profiles"
  on public.profiles for all
  using (public.is_admin());

-- Products (public read)
alter table public.products disable row level security;
alter table public.products enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
  on public.products for select
  using (true);

create policy "Admins can manage products"
  on public.products for all
  using (public.is_admin());

-- Categories (public read)
alter table public.categories disable row level security;
alter table public.categories enable row level security;

drop policy if exists "Anyone can view categories" on public.categories;
create policy "Anyone can view categories"
  on public.categories for select
  using (true);

create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin());

-- Brands (public read)
alter table public.brands disable row level security;
alter table public.brands enable row level security;

drop policy if exists "Anyone can view brands" on public.brands;
create policy "Anyone can view brands"
  on public.brands for select
  using (true);

create policy "Admins can manage brands"
  on public.brands for all
  using (public.is_admin());

-- Orders
drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
  on public.orders for all
  using (public.is_admin());

-- Order items
drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
  on public.order_items for all
  using (public.is_admin());

-- Contact messages
drop policy if exists "Admins can read messages" on public.contact_messages;
create policy "Admins can read messages"
  on public.contact_messages for select
  using (public.is_admin());

-- Blog posts
drop policy if exists "Admins can manage blog" on public.blog_posts;
create policy "Admins can manage blog"
  on public.blog_posts for all
  using (public.is_admin());

-- ============================================================
-- 4. Verify — this should return products
-- ============================================================
select id, name, slug, price from public.products limit 5;
