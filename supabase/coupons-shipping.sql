-- ============================================================
-- Coupons + order totals (discount / shipping / total)
-- Run in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- ============================================================

-- 1. Coupons table
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  description   text,
  kind          text not null check (kind in ('percent', 'fixed')),
  value         numeric(12,2) not null check (value > 0),
  min_subtotal  numeric(12,2) not null default 0,
  max_uses      int,
  used_count    int not null default 0,
  expires_at    timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists coupons_code_upper_key on public.coupons (upper(code));

alter table public.coupons enable row level security;

-- Admins manage coupons; customers never read them directly —
-- validation happens server-side with the service role.
drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 2. Order totals columns
alter table public.orders
  add column if not exists coupon_code     text,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists shipping_amount numeric(12,2) not null default 0,
  add column if not exists total           numeric(12,2);

-- Backfill total for existing orders
update public.orders set total = subtotal where total is null;

-- 3. Atomic usage counter (service role calls this after an order is placed)
create or replace function public.increment_coupon_use(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.coupons set used_count = used_count + 1 where upper(code) = upper(p_code);
$$;
