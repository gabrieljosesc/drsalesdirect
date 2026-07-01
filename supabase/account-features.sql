-- ============================================================
-- Account features: avatars, saved addresses, preferences
-- Run in Supabase SQL Editor AFTER migrate-schema.sql + add-profile-fields.sql
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- ============================================================

-- 1. Extra profile columns
alter table public.profiles
  add column if not exists avatar_url              text,
  add column if not exists notification_preferences jsonb not null default '{}'::jsonb,
  add column if not exists privacy_preferences      jsonb not null default '{}'::jsonb;

-- 2. Saved addresses table
create table if not exists public.user_addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  label          text,
  recipient_name text not null,
  phone          text,
  line1          text not null,
  line2          text,
  city           text,
  state          text,
  postal_code    text,
  country        text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists user_addresses_user_id_idx on public.user_addresses (user_id);

alter table public.user_addresses enable row level security;

drop policy if exists "addresses_select_own" on public.user_addresses;
create policy "addresses_select_own" on public.user_addresses
  for select using (user_id = auth.uid());

drop policy if exists "addresses_insert_own" on public.user_addresses;
create policy "addresses_insert_own" on public.user_addresses
  for insert with check (user_id = auth.uid());

drop policy if exists "addresses_update_own" on public.user_addresses;
create policy "addresses_update_own" on public.user_addresses
  for update using (user_id = auth.uid());

drop policy if exists "addresses_delete_own" on public.user_addresses;
create policy "addresses_delete_own" on public.user_addresses
  for delete using (user_id = auth.uid());

-- 3. Avatars storage bucket (public read, owner write)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for all using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
