-- Add professional registration fields to profiles table.
-- Run AFTER migrate-schema.sql in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new

alter table public.profiles
  add column if not exists prefix          text,
  add column if not exists middle_name     text,
  add column if not exists profession      text,
  add column if not exists specialty       text,
  add column if not exists license_number  text,
  add column if not exists license_expiry  date,
  add column if not exists license_state   text,
  add column if not exists license_country text,
  add column if not exists license_holder_name text,
  add column if not exists business_phone  text,
  add column if not exists website         text,
  add column if not exists address_line1   text,
  add column if not exists city            text,
  add column if not exists state           text,
  add column if not exists postal_code     text,
  add column if not exists country         text;
