-- ============================================================
-- International-order security: government photo-ID verification
-- and secure-payment-link processing (chargeback mitigation).
-- ============================================================

alter table public.orders
  add column if not exists requires_id_verification boolean not null default false,
  add column if not exists id_document_path text,
  add column if not exists payment_method text not null default 'card';

comment on column public.orders.payment_method is
  'card (domestic, card on file) | payment_link (international, secure link sent after ID verification)';

-- Private bucket for government-issued photo IDs. NOT public: uploads and
-- reads happen exclusively through the service role (server actions / admin
-- signed URLs), so no storage RLS policies are added for anon/authenticated.
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;
