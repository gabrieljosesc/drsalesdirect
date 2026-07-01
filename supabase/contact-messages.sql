-- ============================================================
-- Contact form submissions
-- Used by /api/contact (POST). Anonymous visitors can submit;
-- only admins can read the messages.
-- ============================================================

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages_insert_any" on public.contact_messages;
create policy "contact_messages_insert_any" on public.contact_messages
  for insert with check (true);

drop policy if exists "contact_messages_admin_read" on public.contact_messages;
create policy "contact_messages_admin_read" on public.contact_messages
  for select using (public.is_admin(auth.uid()));
