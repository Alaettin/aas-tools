-- ============================================
-- IEC 61406 QR Code Generator — Supabase Setup
-- Dieses SQL im Supabase SQL Editor ausführen
-- ============================================

create table if not exists public.iec_qr_codes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  uri text not null,
  part smallint not null check (part in (1, 2)),
  label text,
  created_at timestamptz default now()
);

create index if not exists iec_qr_codes_user_idx
  on public.iec_qr_codes (user_id, created_at desc);

alter table public.iec_qr_codes enable row level security;

create policy "Users can read own qr codes" on public.iec_qr_codes for select using (user_id = auth.uid());
create policy "Users can insert own qr codes" on public.iec_qr_codes for insert with check (user_id = auth.uid());
create policy "Users can delete own qr codes" on public.iec_qr_codes for delete using (user_id = auth.uid());
