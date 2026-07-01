-- ============================================================
-- Banks & cards: saved payment cards (encrypted PAN at rest)
-- Run in Supabase SQL Editor AFTER account-features.sql
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
--
-- NOTE: Storing card data — even encrypted — places this database in
-- PCI-DSS scope. Full card numbers are AES-256-GCM encrypted using the
-- PAYMENT_CARD_SECRET server env var (never exposed to the browser).
-- ============================================================

create table if not exists public.user_saved_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name_on_card  text not null,
  brand         text,
  last4         text not null,
  exp_month     int  not null,
  exp_year      int  not null,
  pan_encrypted text not null,           -- AES-256-GCM, base64(iv+tag+ciphertext)
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists user_saved_cards_user_id_idx on public.user_saved_cards (user_id);

alter table public.user_saved_cards enable row level security;

-- Users can read their own cards — but NOT the encrypted PAN column
-- (the storefront only ever selects safe columns; admins use service role).
drop policy if exists "saved_cards_select_own" on public.user_saved_cards;
create policy "saved_cards_select_own" on public.user_saved_cards
  for select using (user_id = auth.uid());

drop policy if exists "saved_cards_insert_own" on public.user_saved_cards;
create policy "saved_cards_insert_own" on public.user_saved_cards
  for insert with check (user_id = auth.uid());

drop policy if exists "saved_cards_update_own" on public.user_saved_cards;
create policy "saved_cards_update_own" on public.user_saved_cards
  for update using (user_id = auth.uid());

drop policy if exists "saved_cards_delete_own" on public.user_saved_cards;
create policy "saved_cards_delete_own" on public.user_saved_cards
  for delete using (user_id = auth.uid());
