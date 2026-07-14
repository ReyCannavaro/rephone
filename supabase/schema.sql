create extension if not exists "pgcrypto";

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) not null unique,
  name varchar(50) not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  constraint brands_code_allowed check (code in ('SAMSUNG', 'APPLE', 'GOOGLE'))
);

alter table public.brands enable row level security;

drop policy if exists "Active brands are readable" on public.brands;
create policy "Active brands are readable"
  on public.brands
  for select
  using (is_active = true);

insert into public.brands (code, name, sort_order)
values
  ('SAMSUNG', 'Samsung', 10),
  ('APPLE', 'Apple iPhone', 20),
  ('GOOGLE', 'Google Pixel', 30)
on conflict (code) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;
