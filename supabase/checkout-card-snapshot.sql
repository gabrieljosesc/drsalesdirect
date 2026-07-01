-- ============================================================
-- Checkout: store the card snapshot + encrypted CVV per order
-- Run in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- ============================================================

-- Holds { brand, last4, exp_month, exp_year, name_on_card, cvv_encrypted }
-- so the team can process payment manually against the saved card on file.
alter table public.orders
  add column if not exists payment_card_snapshot jsonb;
