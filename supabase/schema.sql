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
