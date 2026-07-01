-- ============================================================
-- Peptide COA (Certificate of Analysis) PDFs
-- Run in Supabase SQL Editor if not already applied via migration.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-coas', 'product-coas', true)
on conflict (id) do nothing;

drop policy if exists "product_coas_public_read" on storage.objects;
create policy "product_coas_public_read" on storage.objects
  for select using (bucket_id = 'product-coas');

drop policy if exists "product_coas_admin_write" on storage.objects;
create policy "product_coas_admin_write" on storage.objects
  for all using (bucket_id = 'product-coas' and public.is_admin(auth.uid()))
  with check (bucket_id = 'product-coas' and public.is_admin(auth.uid()));

alter table public.products
  add column if not exists coa_url text;
