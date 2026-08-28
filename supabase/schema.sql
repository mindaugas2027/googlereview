create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  sent_to_google boolean not null default false,
  created_at timestamptz not null default now()
);

-- The table may already exist from an earlier setup.
alter table public.feedbacks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.feedbacks
  add column if not exists name text;

alter table public.feedbacks
  add column if not exists rating integer;

alter table public.feedbacks
  add column if not exists comment text;

alter table public.feedbacks
  add column if not exists sent_to_google boolean not null default false;

alter table public.feedbacks
  add column if not exists created_at timestamptz not null default now();

alter table public.feedbacks enable row level security;

drop policy if exists "Anyone can submit feedback" on public.feedbacks;
create policy "Anyone can submit feedback"
on public.feedbacks for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can view their own feedback" on public.feedbacks;
create policy "Users can view their own feedback"
on public.feedbacks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own feedback" on public.feedbacks;
create policy "Users can delete their own feedback"
on public.feedbacks for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view logos" on storage.objects;
create policy "Anyone can view logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'logos');

drop policy if exists "Users can upload their logo" on storage.objects;
create policy "Users can upload their logo"
on storage.objects for insert
to authenticated
with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their logo" on storage.objects;
create policy "Users can update their logo"
on storage.objects for update
to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.qr_scans enable row level security;

drop policy if exists "Anyone can record QR scans" on public.qr_scans;
create policy "Anyone can record QR scans"
on public.qr_scans for insert
to anon, authenticated
with check (true);

drop policy if exists "Users can view their own QR scans" on public.qr_scans;
create policy "Users can view their own QR scans"
on public.qr_scans for select
to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- Inkrementinė statistika (business_stats)
-- Skaitikliai atnaujinami trigger'iais Duomenų bazės pusėje —
-- frontend'as tik skaito gatavas reikšmes, be pilnų skenavimų.
-- ============================================================

create table if not exists public.business_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_feedbacks bigint not null default 0,
  google_redirects bigint not null default 0,
  rating_sum bigint not null default 0,
  rating_1 bigint not null default 0,
  rating_2 bigint not null default 0,
  rating_3 bigint not null default 0,
  rating_4 bigint not null default 0,
  rating_5 bigint not null default 0,
  total_qr_scans bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.business_stats enable row level security;

drop policy if exists "Users can view their own stats" on public.business_stats;
create policy "Users can view their own stats"
on public.business_stats for select
to authenticated
using (auth.uid() = user_id);

-- Įrankis trigger'iams: prideda / atima vieno atsiliepimo indėlį į skaitiklius.
create or replace function public.apply_feedback_delta(
  p_user uuid,
  p_rating integer,
  p_google boolean,
  p_dir integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_stats (user_id) values (p_user)
    on conflict (user_id) do nothing;

  update public.business_stats set
    total_feedbacks = total_feedbacks + p_dir,
    google_redirects = google_redirects + p_dir * (case when p_google then 1 else 0 end),
    rating_sum = rating_sum + p_dir * p_rating,
    rating_1 = rating_1 + p_dir * (case when p_rating = 1 then 1 else 0 end),
    rating_2 = rating_2 + p_dir * (case when p_rating = 2 then 1 else 0 end),
    rating_3 = rating_3 + p_dir * (case when p_rating = 3 then 1 else 0 end),
    rating_4 = rating_4 + p_dir * (case when p_rating = 4 then 1 else 0 end),
    rating_5 = rating_5 + p_dir * (case when p_rating = 5 then 1 else 0 end),
    updated_at = now()
  where user_id = p_user;
end;
$$;

create or replace function public.handle_feedback_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    perform public.apply_feedback_delta(NEW.user_id, NEW.rating, NEW.sent_to_google, 1);
  elsif (TG_OP = 'DELETE') then
    perform public.apply_feedback_delta(OLD.user_id, OLD.rating, OLD.sent_to_google, -1);
  elsif (TG_OP = 'UPDATE') then
    perform public.apply_feedback_delta(OLD.user_id, OLD.rating, OLD.sent_to_google, -1);
    perform public.apply_feedback_delta(NEW.user_id, NEW.rating, NEW.sent_to_google, 1);
  end if;
  return null;
end;
$$;

drop trigger if exists feedbacks_stats_trigger on public.feedbacks;
create trigger feedbacks_stats_trigger
after insert or update or delete on public.feedbacks
for each row execute function public.handle_feedback_change();

create or replace function public.handle_qr_scan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.business_stats (user_id) values (NEW.user_id)
      on conflict (user_id) do nothing;
    update public.business_stats
      set total_qr_scans = total_qr_scans + 1, updated_at = now()
      where user_id = NEW.user_id;
  elsif (TG_OP = 'DELETE') then
    update public.business_stats
      set total_qr_scans = greatest(total_qr_scans - 1, 0), updated_at = now()
      where user_id = OLD.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists qr_scans_stats_trigger on public.qr_scans;
create trigger qr_scans_stats_trigger
after insert or delete on public.qr_scans
for each row execute function public.handle_qr_scan_change();

-- Sparčioms puslapiuotoms užklausoms
create index if not exists feedbacks_user_created_idx
  on public.feedbacks (user_id, created_at desc);
create index if not exists feedbacks_user_rating_idx
  on public.feedbacks (user_id, rating);
create index if not exists qr_scans_user_idx
  on public.qr_scans (user_id);

-- Backfill: perkelti istorinius duomenis į skaitiklius
-- (trigger'iai jau aktyvūs, todėl nauji įvykiai nesidubliuos —
--  esančios eilutės su `on conflict do nothing` neperrašomos).
insert into public.business_stats (
  user_id, total_feedbacks, google_redirects, rating_sum,
  rating_1, rating_2, rating_3, rating_4, rating_5, total_qr_scans
)
select
  f.user_id,
  count(*)::bigint,
  count(*) filter (where f.sent_to_google)::bigint,
  sum(f.rating)::bigint,
  count(*) filter (where f.rating = 1)::bigint,
  count(*) filter (where f.rating = 2)::bigint,
  count(*) filter (where f.rating = 3)::bigint,
  count(*) filter (where f.rating = 4)::bigint,
  count(*) filter (where f.rating = 5)::bigint,
  coalesce((select count(*) from public.qr_scans q where q.user_id = f.user_id), 0)::bigint
from public.feedbacks f
group by f.user_id
on conflict (user_id) do nothing;

insert into public.business_stats (user_id, total_qr_scans)
select q.user_id, count(*)::bigint
from public.qr_scans q
group by q.user_id
on conflict (user_id) do nothing;

-- Realtime: skaitiklių pasikeitimai push'inami į frontend'ą
do $$
begin
  alter publication supabase_realtime add table public.business_stats;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
