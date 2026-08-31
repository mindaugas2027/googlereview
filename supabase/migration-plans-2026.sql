-- ============================================================
-- MIGRACIJA: Vietos (locations) + QR kodų (qr_codes) sistemos
-- Paleiskite šį scenarijų Supabase: SQL Editor → New query → Run.
-- Scenarijus saugus — galima paleisti kelis kartus (if not exists).
-- ============================================================

-- 1) Vietos
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Pagrindinė vieta',
  address text not null default '',
  google_review_url text not null default '',
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;

drop policy if exists "Users manage own locations" on public.locations;
create policy "Users manage own locations"
on public.locations for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 2) QR kodai
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Pagrindinis QR kodas',
  location_id uuid references public.locations(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.qr_codes enable row level security;

drop policy if exists "Users manage own QR codes" on public.qr_codes;
create policy "Users manage own QR codes"
on public.qr_codes for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 3) QR nuskaitymai ir atsiliepimai gauna QR / vietos nuorodas
alter table public.qr_scans
  add column if not exists qr_code_id uuid references public.qr_codes(id) on delete set null;
alter table public.qr_scans
  add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.feedbacks
  add column if not exists qr_code_id uuid references public.qr_codes(id) on delete set null;
alter table public.feedbacks
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create index if not exists qr_scans_qr_code_idx
  on public.qr_scans (qr_code_id);
create index if not exists feedbacks_qr_code_idx
  on public.feedbacks (qr_code_id);
create index if not exists feedbacks_location_idx
  on public.feedbacks (location_id);

-- 4) Agreguota QR statistika (skaičiuojama DB pusėje)
create or replace function public.qr_feedback_stats(p_user uuid, p_threshold integer)
returns table (
  qr_code_id uuid,
  total bigint,
  positive bigint,
  negative bigint,
  average numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.qr_code_id,
    count(*)::bigint as total,
    count(*) filter (where f.rating >= p_threshold)::bigint as positive,
    count(*) filter (where f.rating < p_threshold)::bigint as negative,
    case when count(*) > 0 then round(avg(f.rating), 2) else null end as average
  from public.feedbacks f
  where f.user_id = p_user
  group by f.qr_code_id;
$$;

create or replace function public.qr_scan_stats(p_user uuid)
returns table (
  qr_code_id uuid,
  scans bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.qr_code_id,
    count(*)::bigint as scans
  from public.qr_scans q
  where q.user_id = p_user
  group by q.qr_code_id;
$$;

-- Statistikos funkcijos tik servisui (API maršrutams su service_role)
revoke execute on function public.qr_feedback_stats(uuid, integer) from anon, authenticated, public;
revoke execute on function public.qr_scan_stats(uuid) from anon, authenticated, public;
grant execute on function public.qr_feedback_stats(uuid, integer) to service_role;
grant execute on function public.qr_scan_stats(uuid) to service_role;

notify pgrst, 'reload schema';