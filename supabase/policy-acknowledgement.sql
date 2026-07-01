-- ============================================================
-- Orders: record when the customer accepted the professional-use
-- acknowledgement at checkout (compliance audit trail).
-- Run in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
-- ============================================================

alter table public.orders
  add column if not exists policy_acknowledged_at timestamptz;
