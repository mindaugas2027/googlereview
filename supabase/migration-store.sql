-- Vienkartinių QR / NFC produktų parduotuvė
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  price_cents integer not null check (price_cents > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_products enable row level security;
drop policy if exists "Anyone can view active store products" on public.store_products;
create policy "Anyone can view active store products"
on public.store_products for select
to anon, authenticated
using (active = true);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  product_id uuid references public.store_products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  amount_cents integer not null check (amount_cents > 0),
  customer_email text,
  shipping_name text,
  shipping_address jsonb,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

alter table public.store_orders enable row level security;

insert into storage.buckets (id, name, public)
values ('store-products', 'store-products', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view store product images" on storage.objects;
create policy "Anyone can view store product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'store-products');

create index if not exists store_products_active_order_idx
  on public.store_products (active, sort_order, created_at);
create index if not exists store_orders_created_idx
  on public.store_orders (created_at desc);
