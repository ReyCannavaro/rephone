create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) not null unique,
  name varchar(50) not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_code_allowed check (code in ('SAMSUNG', 'APPLE', 'GOOGLE'))
);

alter table public.brands
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.phone_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  model_code varchar(50) not null unique,
  model_name varchar(100) not null,
  series_name varchar(100),
  release_year smallint,
  default_sim_type varchar(20),
  default_os varchar(50),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phone_models_brand_model_unique unique (brand_id, model_name),
  constraint phone_models_sim_type_allowed check (
    default_sim_type is null or default_sim_type in ('SINGLE', 'DUAL', 'ESIM', 'HYBRID')
  )
);

create table if not exists public.storage_variants (
  id uuid primary key default gen_random_uuid(),
  capacity_gb integer not null unique,
  label varchar(30) not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storage_variants_capacity_positive check (capacity_gb > 0)
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  name varchar(50) not null,
  hex_code varchar(7),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colors_brand_name_unique unique (brand_id, name),
  constraint colors_hex_format check (hex_code is null or hex_code ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index if not exists colors_brand_name_unique_idx
on public.colors (coalesce(brand_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table if not exists public.physical_conditions (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) not null unique,
  name varchar(100) not null,
  score_min integer,
  score_max integer,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physical_conditions_score_range check (
    (score_min is null and score_max is null)
    or (score_min is not null and score_max is not null and score_min <= score_max)
  )
);

create table if not exists public.accessory_types (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null unique,
  name varchar(100) not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  category varchar(30) not null,
  name varchar(150) not null,
  input_type varchar(20) not null,
  unit_label varchar(20),
  is_required boolean not null default true,
  applies_to_brand_id uuid references public.brands(id),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_items_category_allowed check (
    category in ('PHYSICAL', 'FUNCTION', 'SECURITY', 'NETWORK', 'BATTERY')
  ),
  constraint inspection_items_input_type_allowed check (
    input_type in ('STATUS', 'BOOLEAN', 'NUMBER', 'TEXT')
  )
);

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  seller_code varchar(30) not null unique,
  name varchar(150) not null,
  phone varchar(30),
  identity_number varchar(100),
  city varchar(100),
  address text,
  source_channel varchar(100),
  risk_flag boolean not null default false,
  risk_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code varchar(30) not null unique,
  name varchar(150) not null,
  phone varchar(30),
  city varchar(100),
  address text,
  is_repeat_customer boolean not null default false,
  is_blocked boolean not null default false,
  blocked_reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_code varchar(30) not null unique,
  account_name varchar(150) not null,
  account_type varchar(20) not null,
  account_subtype varchar(40) not null,
  parent_id uuid references public.accounts(id),
  normal_balance varchar(10) not null,
  allow_manual_entry boolean not null default false,
  is_cash_account boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_type_allowed check (
    account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE')
  ),
  constraint accounts_normal_balance_allowed check (normal_balance in ('DEBIT', 'CREDIT'))
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts(id),
  bank_name varchar(100) not null,
  account_number_masked varchar(50),
  account_holder varchar(150) not null,
  opening_balance numeric(18,2) not null default 0,
  is_default_purchase boolean not null default false,
  is_default_sales boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null unique,
  name varchar(100) not null,
  default_fee_type varchar(20) not null default 'NONE',
  default_fee_value numeric(18,2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_channels_fee_type_allowed check (
    default_fee_type in ('NONE', 'FIXED', 'PERCENTAGE')
  ),
  constraint sales_channels_fee_value_non_negative check (default_fee_value >= 0)
);

create table if not exists public.cost_categories (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null unique,
  name varchar(100) not null,
  scope varchar(20) not null,
  expense_account_id uuid references public.accounts(id),
  inventory_account_id uuid references public.accounts(id),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_categories_scope_allowed check (scope in ('UNIT', 'OPERATING', 'SALES'))
);

create index if not exists phone_models_brand_id_idx on public.phone_models(brand_id);
create index if not exists colors_brand_id_idx on public.colors(brand_id);
create index if not exists inspection_items_category_idx on public.inspection_items(category);
create index if not exists inspection_items_brand_id_idx on public.inspection_items(applies_to_brand_id);
create index if not exists sellers_name_idx on public.sellers(name);
create index if not exists customers_name_idx on public.customers(name);
create index if not exists accounts_type_idx on public.accounts(account_type);
create index if not exists cost_categories_scope_idx on public.cost_categories(scope);

create or replace trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create or replace trigger phone_models_set_updated_at
before update on public.phone_models
for each row execute function public.set_updated_at();

create or replace trigger storage_variants_set_updated_at
before update on public.storage_variants
for each row execute function public.set_updated_at();

create or replace trigger colors_set_updated_at
before update on public.colors
for each row execute function public.set_updated_at();

create or replace trigger physical_conditions_set_updated_at
before update on public.physical_conditions
for each row execute function public.set_updated_at();

create or replace trigger accessory_types_set_updated_at
before update on public.accessory_types
for each row execute function public.set_updated_at();

create or replace trigger inspection_items_set_updated_at
before update on public.inspection_items
for each row execute function public.set_updated_at();

create or replace trigger sellers_set_updated_at
before update on public.sellers
for each row execute function public.set_updated_at();

create or replace trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create or replace trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create or replace trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_updated_at();

create or replace trigger sales_channels_set_updated_at
before update on public.sales_channels
for each row execute function public.set_updated_at();

create or replace trigger cost_categories_set_updated_at
before update on public.cost_categories
for each row execute function public.set_updated_at();

alter table public.brands enable row level security;
alter table public.phone_models enable row level security;
alter table public.storage_variants enable row level security;
alter table public.colors enable row level security;
alter table public.physical_conditions enable row level security;
alter table public.accessory_types enable row level security;
alter table public.inspection_items enable row level security;
alter table public.sellers enable row level security;
alter table public.customers enable row level security;
alter table public.accounts enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.sales_channels enable row level security;
alter table public.cost_categories enable row level security;

drop policy if exists "Active brands are readable" on public.brands;
create policy "Active brands are readable" on public.brands for select using (is_active = true);

drop policy if exists "Active phone models are readable" on public.phone_models;
create policy "Active phone models are readable" on public.phone_models for select using (is_active = true);

drop policy if exists "Active storage variants are readable" on public.storage_variants;
create policy "Active storage variants are readable" on public.storage_variants for select using (is_active = true);

drop policy if exists "Active colors are readable" on public.colors;
create policy "Active colors are readable" on public.colors for select using (is_active = true);

drop policy if exists "Active physical conditions are readable" on public.physical_conditions;
create policy "Active physical conditions are readable" on public.physical_conditions for select using (is_active = true);

drop policy if exists "Active accessory types are readable" on public.accessory_types;
create policy "Active accessory types are readable" on public.accessory_types for select using (is_active = true);

drop policy if exists "Active inspection items are readable" on public.inspection_items;
create policy "Active inspection items are readable" on public.inspection_items for select using (is_active = true);

drop policy if exists "Active sellers are readable" on public.sellers;
create policy "Active sellers are readable" on public.sellers for select using (is_active = true);

drop policy if exists "Active customers are readable" on public.customers;
create policy "Active customers are readable" on public.customers for select using (is_active = true);

drop policy if exists "Active accounts are readable" on public.accounts;
create policy "Active accounts are readable" on public.accounts for select using (is_active = true);

drop policy if exists "Active bank accounts are readable" on public.bank_accounts;
create policy "Active bank accounts are readable" on public.bank_accounts for select using (is_active = true);

drop policy if exists "Active sales channels are readable" on public.sales_channels;
create policy "Active sales channels are readable" on public.sales_channels for select using (is_active = true);

drop policy if exists "Active cost categories are readable" on public.cost_categories;
create policy "Active cost categories are readable" on public.cost_categories for select using (is_active = true);

insert into public.brands (code, name, sort_order)
values
  ('SAMSUNG', 'Samsung', 10),
  ('APPLE', 'Apple iPhone', 20),
  ('GOOGLE', 'Google Pixel', 30)
on conflict (code) do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = true;

insert into public.phone_models (
  brand_id, model_code, model_name, series_name, release_year, default_sim_type, default_os
)
values
  ((select id from public.brands where code = 'APPLE'), 'IPHONE_11', 'iPhone 11', 'iPhone', 2019, 'DUAL', 'iOS'),
  ((select id from public.brands where code = 'APPLE'), 'IPHONE_12', 'iPhone 12', 'iPhone', 2020, 'DUAL', 'iOS'),
  ((select id from public.brands where code = 'APPLE'), 'IPHONE_13', 'iPhone 13', 'iPhone', 2021, 'DUAL', 'iOS'),
  ((select id from public.brands where code = 'APPLE'), 'IPHONE_14', 'iPhone 14', 'iPhone', 2022, 'DUAL', 'iOS'),
  ((select id from public.brands where code = 'APPLE'), 'IPHONE_15', 'iPhone 15', 'iPhone', 2023, 'DUAL', 'iOS'),
  ((select id from public.brands where code = 'SAMSUNG'), 'GALAXY_S21', 'Galaxy S21', 'Galaxy S', 2021, 'DUAL', 'Android'),
  ((select id from public.brands where code = 'SAMSUNG'), 'GALAXY_S22', 'Galaxy S22', 'Galaxy S', 2022, 'DUAL', 'Android'),
  ((select id from public.brands where code = 'SAMSUNG'), 'GALAXY_S23', 'Galaxy S23', 'Galaxy S', 2023, 'DUAL', 'Android'),
  ((select id from public.brands where code = 'SAMSUNG'), 'GALAXY_A54', 'Galaxy A54', 'Galaxy A', 2023, 'DUAL', 'Android'),
  ((select id from public.brands where code = 'GOOGLE'), 'PIXEL_6', 'Pixel 6', 'Pixel', 2021, 'ESIM', 'Android'),
  ((select id from public.brands where code = 'GOOGLE'), 'PIXEL_7', 'Pixel 7', 'Pixel', 2022, 'ESIM', 'Android'),
  ((select id from public.brands where code = 'GOOGLE'), 'PIXEL_8', 'Pixel 8', 'Pixel', 2023, 'ESIM', 'Android')
on conflict (model_code) do update
set
  model_name = excluded.model_name,
  series_name = excluded.series_name,
  release_year = excluded.release_year,
  default_sim_type = excluded.default_sim_type,
  default_os = excluded.default_os,
  is_active = true;

insert into public.storage_variants (capacity_gb, label, sort_order)
values
  (32, '32 GB', 10),
  (64, '64 GB', 20),
  (128, '128 GB', 30),
  (256, '256 GB', 40),
  (512, '512 GB', 50),
  (1024, '1 TB', 60)
on conflict (capacity_gb) do update
set label = excluded.label, sort_order = excluded.sort_order, is_active = true;

insert into public.colors (brand_id, name, hex_code, sort_order)
select *
from (
  values
  (null::uuid, 'Black', '#111827', 10),
  (null::uuid, 'White', '#F9FAFB', 20),
  (null::uuid, 'Silver', '#D1D5DB', 30),
  (null::uuid, 'Gold', '#D4AF37', 40),
  (null::uuid, 'Blue', '#2563EB', 50),
  (null::uuid, 'Green', '#16A34A', 60),
  (null::uuid, 'Red', '#DC2626', 70),
  (null::uuid, 'Purple', '#7C3AED', 80)
) as seed(brand_id, name, hex_code, sort_order)
where not exists (
  select 1
  from public.colors existing
  where coalesce(existing.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
    = coalesce(seed.brand_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and lower(existing.name) = lower(seed.name)
);

insert into public.physical_conditions (code, name, score_min, score_max, description, sort_order)
values
  ('LIKE_NEW', 'Like New', 95, 100, 'Sangat mulus, nyaris seperti baru.', 10),
  ('MULUS', 'Mulus', 85, 94, 'Bekas pakai ringan tanpa minus mencolok.', 20),
  ('LECET_TIPIS', 'Lecet Tipis', 75, 84, 'Ada lecet ringan yang wajar.', 30),
  ('LECET_PEMAKAIAN', 'Lecet Pemakaian', 60, 74, 'Ada tanda pemakaian cukup terlihat.', 40),
  ('MINUS_FISIK', 'Minus Fisik', 40, 59, 'Ada minus fisik yang perlu dijelaskan ke pembeli.', 50),
  ('BEKAS_SERVIS', 'Bekas Servis', null, null, 'Pernah dibongkar atau diservis.', 60)
on conflict (code) do update
set
  name = excluded.name,
  score_min = excluded.score_min,
  score_max = excluded.score_max,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.accessory_types (code, name, sort_order)
values
  ('UNIT', 'Unit HP', 10),
  ('BOX', 'Box', 20),
  ('CHARGER', 'Charger', 30),
  ('CABLE', 'Kabel Data', 40),
  ('CASE', 'Case', 50),
  ('TEMPERED_GLASS', 'Tempered Glass', 60),
  ('INVOICE', 'Invoice Pembelian', 70),
  ('SIM_EJECTOR', 'SIM Ejector', 80)
on conflict (code) do update
set name = excluded.name, sort_order = excluded.sort_order, is_active = true;

insert into public.inspection_items (code, category, name, input_type, unit_label, is_required, sort_order)
values
  ('SCREEN_DISPLAY', 'PHYSICAL', 'Layar', 'STATUS', null, true, 10),
  ('FRAME', 'PHYSICAL', 'Frame', 'STATUS', null, true, 20),
  ('BACKDOOR', 'PHYSICAL', 'Backdoor', 'STATUS', null, true, 30),
  ('CAMERA_LENS', 'PHYSICAL', 'Lensa Kamera', 'STATUS', null, true, 40),
  ('BUTTONS', 'PHYSICAL', 'Tombol', 'STATUS', null, true, 50),
  ('CHARGING_PORT', 'PHYSICAL', 'Port Charger', 'STATUS', null, true, 60),
  ('OPENED_REPAIR_SIGN', 'PHYSICAL', 'Bekas Bongkar', 'BOOLEAN', null, true, 70),
  ('TOUCHSCREEN', 'FUNCTION', 'Touchscreen', 'STATUS', null, true, 110),
  ('FRONT_CAMERA', 'FUNCTION', 'Kamera Depan', 'STATUS', null, true, 120),
  ('MAIN_CAMERA', 'FUNCTION', 'Kamera Utama', 'STATUS', null, true, 130),
  ('FLASH', 'FUNCTION', 'Flash', 'STATUS', null, true, 140),
  ('SPEAKER', 'FUNCTION', 'Speaker', 'STATUS', null, true, 150),
  ('MICROPHONE', 'FUNCTION', 'Mikrofon', 'STATUS', null, true, 160),
  ('WIFI', 'NETWORK', 'Wi-Fi', 'STATUS', null, true, 210),
  ('BLUETOOTH', 'NETWORK', 'Bluetooth', 'STATUS', null, true, 220),
  ('GPS', 'NETWORK', 'GPS', 'STATUS', null, true, 230),
  ('NFC', 'NETWORK', 'NFC', 'STATUS', null, false, 240),
  ('SIM_1', 'NETWORK', 'SIM 1', 'STATUS', null, true, 250),
  ('SIM_2', 'NETWORK', 'SIM 2', 'STATUS', null, false, 260),
  ('ICLOUD_STATUS', 'SECURITY', 'iCloud Status', 'STATUS', null, true, 310),
  ('GOOGLE_ACCOUNT_STATUS', 'SECURITY', 'Google Account Status', 'STATUS', null, true, 320),
  ('FIND_MY_STATUS', 'SECURITY', 'Find My Status', 'STATUS', null, true, 330),
  ('IMEI_STATUS', 'SECURITY', 'IMEI Status', 'STATUS', null, true, 340),
  ('MDM_STATUS', 'SECURITY', 'MDM Status', 'STATUS', null, false, 350),
  ('BATTERY_HEALTH', 'BATTERY', 'Battery Health', 'NUMBER', '%', false, 410),
  ('CYCLE_COUNT', 'BATTERY', 'Cycle Count', 'NUMBER', 'cycle', false, 420),
  ('BATTERY_WARNING', 'BATTERY', 'Battery Warning', 'BOOLEAN', null, false, 430),
  ('CHARGING_STABILITY', 'BATTERY', 'Charging Stability', 'STATUS', null, true, 440)
on conflict (code) do update
set
  category = excluded.category,
  name = excluded.name,
  input_type = excluded.input_type,
  unit_label = excluded.unit_label,
  is_required = excluded.is_required,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.accounts (
  account_code, account_name, account_type, account_subtype, normal_balance,
  allow_manual_entry, is_cash_account, sort_order
)
values
  ('1101', 'Kas Tunai', 'ASSET', 'CASH', 'DEBIT', true, true, 1101),
  ('1102', 'Bank/Rekening Usaha', 'ASSET', 'BANK', 'DEBIT', true, true, 1102),
  ('1201', 'Persediaan HP Bekas', 'ASSET', 'INVENTORY', 'DEBIT', false, false, 1201),
  ('1202', 'Piutang Pelanggan', 'ASSET', 'RECEIVABLE', 'DEBIT', true, false, 1202),
  ('1301', 'Peralatan', 'ASSET', 'FIXED_ASSET', 'DEBIT', true, false, 1301),
  ('1302', 'Akumulasi Penyusutan', 'ASSET', 'ACCUMULATED_DEPRECIATION', 'CREDIT', true, false, 1302),
  ('2101', 'Utang Pembelian Unit', 'LIABILITY', 'PURCHASE_PAYABLE', 'CREDIT', true, false, 2101),
  ('2102', 'Utang Operasional', 'LIABILITY', 'OPERATING_PAYABLE', 'CREDIT', true, false, 2102),
  ('2103', 'Uang Muka Pelanggan', 'LIABILITY', 'CUSTOMER_DEPOSIT', 'CREDIT', true, false, 2103),
  ('2104', 'Utang Pengembalian Dana', 'LIABILITY', 'REFUND_PAYABLE', 'CREDIT', true, false, 2104),
  ('3101', 'Modal Pemilik', 'EQUITY', 'OWNER_CAPITAL', 'CREDIT', false, false, 3101),
  ('3102', 'Prive', 'EQUITY', 'OWNER_DRAWING', 'DEBIT', false, false, 3102),
  ('3201', 'Laba Ditahan', 'EQUITY', 'RETAINED_EARNINGS', 'CREDIT', false, false, 3201),
  ('3202', 'Laba Tahun Berjalan', 'EQUITY', 'CURRENT_YEAR_EARNINGS', 'CREDIT', false, false, 3202),
  ('4101', 'Pendapatan Penjualan HP', 'REVENUE', 'PHONE_SALES', 'CREDIT', false, false, 4101),
  ('4102', 'Pendapatan Lainnya', 'REVENUE', 'OTHER_REVENUE', 'CREDIT', true, false, 4102),
  ('5101', 'Harga Pokok Penjualan HP', 'COGS', 'PHONE_COGS', 'DEBIT', false, false, 5101),
  ('6101', 'Beban Admin Marketplace', 'EXPENSE', 'MARKETPLACE_FEE', 'DEBIT', true, false, 6101),
  ('6102', 'Beban Ongkir Penjualan', 'EXPENSE', 'SALES_SHIPPING', 'DEBIT', true, false, 6102),
  ('6103', 'Beban Iklan', 'EXPENSE', 'ADS', 'DEBIT', true, false, 6103),
  ('6104', 'Beban Internet', 'EXPENSE', 'INTERNET', 'DEBIT', true, false, 6104),
  ('6105', 'Beban Transport Operasional', 'EXPENSE', 'OPERATING_TRANSPORT', 'DEBIT', true, false, 6105),
  ('6106', 'Beban Bank', 'EXPENSE', 'BANK_FEE', 'DEBIT', true, false, 6106),
  ('6199', 'Beban Operasional Lainnya', 'EXPENSE', 'OTHER_OPERATING', 'DEBIT', true, false, 6199)
on conflict (account_code) do update
set
  account_name = excluded.account_name,
  account_type = excluded.account_type,
  account_subtype = excluded.account_subtype,
  normal_balance = excluded.normal_balance,
  allow_manual_entry = excluded.allow_manual_entry,
  is_cash_account = excluded.is_cash_account,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.bank_accounts (
  account_id, bank_name, account_number_masked, account_holder,
  opening_balance, is_default_purchase, is_default_sales
)
values (
  (select id from public.accounts where account_code = '1102'),
  'Rekening Usaha',
  null,
  'Pemilik Usaha',
  0,
  true,
  true
)
on conflict (account_id) do update
set
  bank_name = excluded.bank_name,
  account_number_masked = excluded.account_number_masked,
  account_holder = excluded.account_holder,
  is_default_purchase = excluded.is_default_purchase,
  is_default_sales = excluded.is_default_sales,
  is_active = true;

insert into public.sales_channels (code, name, default_fee_type, default_fee_value, sort_order)
values
  ('COD', 'COD Langsung', 'NONE', 0, 10),
  ('FACEBOOK', 'Facebook Marketplace', 'NONE', 0, 20),
  ('INSTAGRAM', 'Instagram', 'NONE', 0, 30),
  ('WHATSAPP', 'WhatsApp', 'NONE', 0, 40),
  ('FRIEND', 'Teman/Referral', 'NONE', 0, 50)
on conflict (code) do update
set
  name = excluded.name,
  default_fee_type = excluded.default_fee_type,
  default_fee_value = excluded.default_fee_value,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.cost_categories (
  code, name, scope, expense_account_id, inventory_account_id, sort_order
)
values
  ('SERVICE', 'Servis', 'UNIT', null, (select id from public.accounts where account_code = '1201'), 10),
  ('SPARE_PART', 'Spare Part', 'UNIT', null, (select id from public.accounts where account_code = '1201'), 20),
  ('CLEANING', 'Cleaning', 'UNIT', null, (select id from public.accounts where account_code = '1201'), 30),
  ('TEMPERED_GLASS', 'Tempered Glass', 'UNIT', null, (select id from public.accounts where account_code = '1201'), 40),
  ('PURCHASE_TRANSFER_FEE', 'Biaya Transfer Pembelian', 'UNIT', null, (select id from public.accounts where account_code = '1201'), 50),
  ('PICKUP_TRANSPORT', 'Transport Pengambilan', 'UNIT', null, (select id from public.accounts where account_code = '1201'), 60),
  ('MARKETPLACE_ADMIN', 'Admin Marketplace', 'SALES', (select id from public.accounts where account_code = '6101'), null, 110),
  ('SALES_SHIPPING', 'Ongkir Ditanggung Penjual', 'SALES', (select id from public.accounts where account_code = '6102'), null, 120),
  ('PACKAGING', 'Packaging', 'SALES', (select id from public.accounts where account_code = '6199'), null, 130),
  ('SALES_COD_TRANSPORT', 'Transport COD Penjualan', 'SALES', (select id from public.accounts where account_code = '6105'), null, 140),
  ('INTERNET', 'Internet', 'OPERATING', (select id from public.accounts where account_code = '6104'), null, 210),
  ('ADS', 'Iklan Umum', 'OPERATING', (select id from public.accounts where account_code = '6103'), null, 220),
  ('APP_SUBSCRIPTION', 'Langganan Aplikasi', 'OPERATING', (select id from public.accounts where account_code = '6199'), null, 230),
  ('BANK_FEE', 'Biaya Bank', 'OPERATING', (select id from public.accounts where account_code = '6106'), null, 240),
  ('OPERATING_TRANSPORT', 'Transport Operasional', 'OPERATING', (select id from public.accounts where account_code = '6105'), null, 250),
  ('OTHER_OPERATING', 'Operasional Lainnya', 'OPERATING', (select id from public.accounts where account_code = '6199'), null, 260)
on conflict (code) do update
set
  name = excluded.name,
  scope = excluded.scope,
  expense_account_id = excluded.expense_account_id,
  inventory_account_id = excluded.inventory_account_id,
  sort_order = excluded.sort_order,
  is_active = true;
