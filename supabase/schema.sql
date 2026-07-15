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

create table if not exists public.unit_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number varchar(40) not null unique,
  receipt_date date not null,
  seller_id uuid not null references public.sellers(id),
  status varchar(20) not null default 'DRAFT',
  decision_at timestamptz,
  rejection_reason_code varchar(50),
  rejection_notes text,
  purchase_account_id uuid references public.accounts(id),
  purchase_payment_reference varchar(100),
  purchase_payment_proof_url text,
  purchase_payment_proof_filename varchar(255),
  purchase_payment_proof_recorded_at timestamptz,
  photo_drive_url text,
  photo_drive_url_type varchar(20),
  total_purchase_amount numeric(18,2) not null default 0,
  total_direct_cost numeric(18,2) not null default 0,
  total_unit_cost numeric(18,2) not null default 0,
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_receipts_status_allowed check (
    status in ('DRAFT', 'INSPECTION', 'ACCEPTED', 'REJECTED')
  ),
  constraint unit_receipts_photo_url_type_allowed check (
    photo_drive_url_type is null or photo_drive_url_type in ('FOLDER', 'ALBUM', 'PHOTO')
  ),
  constraint unit_receipts_amounts_non_negative check (
    total_purchase_amount >= 0 and total_direct_cost >= 0 and total_unit_cost >= 0
  ),
  constraint unit_receipts_accepted_payment_required check (
    status <> 'ACCEPTED'
    or (
      purchase_account_id is not null
      and purchase_payment_reference is not null
      and purchase_payment_proof_url is not null
      and photo_drive_url is not null
      and total_purchase_amount > 0
    )
  ),
  constraint unit_receipts_rejected_reason_required check (
    status <> 'REJECTED' or rejection_notes is not null
  )
);

create table if not exists public.phone_units (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references public.unit_receipts(id),
  stock_code varchar(40) not null unique,
  stock_status varchar(20) not null default 'DRAFT',
  brand_id uuid not null references public.brands(id),
  model_id uuid not null references public.phone_models(id),
  storage_variant_id uuid references public.storage_variants(id),
  color_id uuid references public.colors(id),
  physical_condition_id uuid references public.physical_conditions(id),
  imei_1 varchar(30) not null,
  imei_2 varchar(30),
  serial_number varchar(100),
  sim_type varchar(20),
  battery_health integer,
  cycle_count integer,
  icloud_status varchar(30),
  google_account_status varchar(30),
  find_my_status varchar(30),
  imei_status varchar(30),
  mdm_status varchar(30),
  purchase_price numeric(18,2) not null default 0,
  purchase_transfer_fee numeric(18,2) not null default 0,
  total_unit_cost numeric(18,2) not null default 0,
  current_listing_price numeric(18,2),
  minimum_price numeric(18,2),
  minus_notes text,
  internal_notes text,
  photo_drive_url text,
  acquired_at date,
  sold_at timestamptz,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phone_units_stock_status_allowed check (
    stock_status in (
      'DRAFT',
      'INSPECTION',
      'REJECTED',
      'IN_STOCK',
      'RESERVED',
      'SOLD',
      'RETURNED',
      'SERVICE',
      'DAMAGED',
      'LOST',
      'WRITTEN_OFF'
    )
  ),
  constraint phone_units_sim_type_allowed check (
    sim_type is null or sim_type in ('SINGLE', 'DUAL', 'ESIM', 'HYBRID')
  ),
  constraint phone_units_battery_health_range check (
    battery_health is null or (battery_health >= 0 and battery_health <= 100)
  ),
  constraint phone_units_cycle_count_non_negative check (
    cycle_count is null or cycle_count >= 0
  ),
  constraint phone_units_amounts_non_negative check (
    purchase_price >= 0
    and purchase_transfer_fee >= 0
    and total_unit_cost >= 0
    and (current_listing_price is null or current_listing_price >= 0)
    and (minimum_price is null or minimum_price >= 0)
  ),
  constraint phone_units_drive_url_required_when_stock check (
    stock_status not in ('IN_STOCK', 'RESERVED', 'SOLD')
    or photo_drive_url is not null
  ),
  constraint phone_units_security_status_required_when_stock check (
    stock_status not in ('IN_STOCK', 'RESERVED', 'SOLD')
    or (imei_status is not null and (icloud_status is not null or google_account_status is not null))
  )
);

create table if not exists public.unit_inspection_results (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.unit_receipts(id) on delete cascade,
  phone_unit_id uuid not null references public.phone_units(id) on delete cascade,
  inspection_item_id uuid not null references public.inspection_items(id),
  result_status varchar(30),
  boolean_value boolean,
  number_value numeric(18,2),
  text_value text,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_inspection_results_unique_item unique (phone_unit_id, inspection_item_id),
  constraint unit_inspection_results_status_allowed check (
    result_status is null or result_status in ('OK', 'MINOR', 'ISSUE', 'FAILED', 'UNKNOWN', 'NOT_APPLICABLE')
  )
);

create table if not exists public.unit_accessories (
  id uuid primary key default gen_random_uuid(),
  phone_unit_id uuid not null references public.phone_units(id) on delete cascade,
  accessory_type_id uuid not null references public.accessory_types(id),
  is_included boolean not null default true,
  condition_notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_accessories_unique_type unique (phone_unit_id, accessory_type_id)
);

create table if not exists public.unit_photos (
  id uuid primary key default gen_random_uuid(),
  phone_unit_id uuid not null references public.phone_units(id) on delete cascade,
  photo_type varchar(30) not null,
  drive_url text not null,
  file_name varchar(255),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_photos_photo_type_allowed check (
    photo_type in (
      'FRONT',
      'BACK',
      'LEFT_FRAME',
      'RIGHT_FRAME',
      'SCREEN',
      'IMEI',
      'ACCESSORIES',
      'DEFECT',
      'PAYMENT_PROOF',
      'OTHER'
    )
  ),
  constraint unit_photos_drive_url_https check (drive_url ~ '^https://')
);

create table if not exists public.unit_costs (
  id uuid primary key default gen_random_uuid(),
  cost_number varchar(40) not null unique,
  phone_unit_id uuid not null references public.phone_units(id),
  cost_category_id uuid not null references public.cost_categories(id),
  cost_date date not null,
  description varchar(255) not null,
  amount numeric(18,2) not null,
  payment_account_id uuid references public.accounts(id),
  is_paid boolean not null default true,
  proof_url text,
  proof_filename varchar(255),
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_costs_amount_positive check (amount > 0),
  constraint unit_costs_paid_account_required check (is_paid = false or payment_account_id is not null),
  constraint unit_costs_proof_url_https check (proof_url is null or proof_url ~ '^https://')
);

create table if not exists public.unit_price_histories (
  id uuid primary key default gen_random_uuid(),
  phone_unit_id uuid not null references public.phone_units(id),
  listing_price numeric(18,2) not null,
  minimum_price numeric(18,2) not null,
  estimated_profit_at_listing numeric(18,2) not null,
  estimated_profit_at_minimum numeric(18,2) not null,
  reason varchar(255),
  effective_at timestamptz not null default now(),
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_price_histories_prices_positive check (listing_price > 0 and minimum_price > 0)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number varchar(40) not null unique,
  sale_date date not null,
  customer_id uuid not null references public.customers(id),
  sales_channel_id uuid references public.sales_channels(id),
  status varchar(20) not null default 'DRAFT',
  payment_account_id uuid references public.accounts(id),
  payment_method varchar(20),
  payment_reference varchar(100),
  payment_proof_url text,
  payment_proof_filename varchar(255),
  payment_proof_recorded_at timestamptz,
  completed_at timestamptz,
  subtotal_amount numeric(18,2) not null default 0,
  total_sales_cost numeric(18,2) not null default 0,
  total_net_amount numeric(18,2) not null default 0,
  total_cogs_amount numeric(18,2) not null default 0,
  total_profit_amount numeric(18,2) not null default 0,
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_status_allowed check (
    status in ('DRAFT', 'COMPLETED', 'CANCELLED', 'RETURNED')
  ),
  constraint sales_payment_method_allowed check (
    payment_method is null or payment_method in ('CASH', 'TRANSFER', 'MARKETPLACE', 'OTHER')
  ),
  constraint sales_amounts_non_negative check (
    subtotal_amount >= 0
    and total_sales_cost >= 0
    and total_net_amount >= 0
    and total_cogs_amount >= 0
  ),
  constraint sales_completed_payment_required check (
    status <> 'COMPLETED'
    or (
      payment_account_id is not null
      and payment_reference is not null
      and payment_proof_url is not null
      and subtotal_amount > 0
      and completed_at is not null
    )
  ),
  constraint sales_payment_proof_url_https check (
    payment_proof_url is null or payment_proof_url ~ '^https://'
  )
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  phone_unit_id uuid not null references public.phone_units(id),
  listing_price numeric(18,2),
  minimum_price numeric(18,2),
  final_price numeric(18,2) not null,
  unit_cost numeric(18,2) not null,
  sales_cost_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null,
  profit_amount numeric(18,2) not null,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_items_amounts_valid check (
    final_price > 0
    and unit_cost >= 0
    and sales_cost_amount >= 0
  )
);

create table if not exists public.sale_costs (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id) on delete cascade,
  cost_category_id uuid not null references public.cost_categories(id),
  description varchar(255) not null,
  amount numeric(18,2) not null,
  payment_account_id uuid references public.accounts(id),
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_costs_amount_positive check (amount > 0)
);

create table if not exists public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  return_number varchar(40) not null unique,
  sale_id uuid not null references public.sales(id),
  return_date date not null,
  status varchar(20) not null default 'COMPLETED',
  target_stock_status varchar(20) not null,
  return_reason_code varchar(50),
  return_notes text,
  refund_amount numeric(18,2) not null default 0,
  refund_account_id uuid references public.accounts(id),
  refund_reference varchar(100),
  refund_proof_url text,
  refund_proof_filename varchar(255),
  refund_recorded_at timestamptz,
  reversed_sale_journal_entry_id uuid,
  journal_entry_id uuid,
  completed_at timestamptz,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_returns_status_allowed check (
    status in ('COMPLETED', 'CANCELLED')
  ),
  constraint sale_returns_target_stock_status_allowed check (
    target_stock_status in ('IN_STOCK', 'SERVICE', 'DAMAGED')
  ),
  constraint sale_returns_refund_amount_non_negative check (refund_amount >= 0),
  constraint sale_returns_refund_required_when_amount_positive check (
    refund_amount = 0
    or (
      refund_account_id is not null
      and refund_reference is not null
      and refund_proof_url is not null
    )
  ),
  constraint sale_returns_refund_proof_url_https check (
    refund_proof_url is null or refund_proof_url ~ '^https://'
  )
);

create table if not exists public.capital_contributions (
  id uuid primary key default gen_random_uuid(),
  contribution_number varchar(40) not null unique,
  contribution_date date not null,
  account_id uuid not null references public.accounts(id),
  amount numeric(18,2) not null,
  reference varchar(100),
  proof_url text,
  proof_filename varchar(255),
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capital_contributions_amount_positive check (amount > 0),
  constraint capital_contributions_proof_url_https check (proof_url is null or proof_url ~ '^https://')
);

create table if not exists public.owner_drawings (
  id uuid primary key default gen_random_uuid(),
  drawing_number varchar(40) not null unique,
  drawing_date date not null,
  account_id uuid not null references public.accounts(id),
  amount numeric(18,2) not null,
  reference varchar(100),
  proof_url text,
  proof_filename varchar(255),
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_drawings_amount_positive check (amount > 0),
  constraint owner_drawings_proof_url_https check (proof_url is null or proof_url ~ '^https://')
);

create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number varchar(40) not null unique,
  expense_date date not null,
  cost_category_id uuid references public.cost_categories(id),
  expense_account_id uuid not null references public.accounts(id),
  payment_account_id uuid not null references public.accounts(id),
  description varchar(255) not null,
  amount numeric(18,2) not null,
  reference varchar(100),
  proof_url text,
  proof_filename varchar(255),
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operating_expenses_amount_positive check (amount > 0),
  constraint operating_expenses_proof_url_https check (proof_url is null or proof_url ~ '^https://')
);

create table if not exists public.cash_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number varchar(40) not null unique,
  adjustment_date date not null,
  account_id uuid not null references public.accounts(id),
  adjustment_type varchar(20) not null,
  amount numeric(18,2) not null,
  reason varchar(255) not null,
  offset_account_id uuid references public.accounts(id),
  reference varchar(100),
  proof_url text,
  proof_filename varchar(255),
  journal_entry_id uuid,
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_adjustments_type_allowed check (adjustment_type in ('INCREASE', 'DECREASE')),
  constraint cash_adjustments_amount_positive check (amount > 0),
  constraint cash_adjustments_proof_url_https check (proof_url is null or proof_url ~ '^https://')
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_number varchar(40) not null unique,
  transaction_date date not null,
  source_module varchar(30) not null,
  source_id uuid not null,
  description varchar(255) not null,
  status varchar(20) not null default 'POSTED',
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  posted_at timestamptz,
  reversed_entry_id uuid references public.journal_entries(id),
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entries_status_allowed check (status in ('DRAFT', 'POSTED', 'REVERSED')),
  constraint journal_entries_source_module_allowed check (
    source_module in (
      'RECEIPT',
      'UNIT_COST',
      'SALE',
      'SALE_RETURN',
      'CAPITAL',
      'OWNER_DRAWING',
      'OPERATING_EXPENSE',
      'CASH_ADJUSTMENT',
      'MANUAL'
    )
  ),
  constraint journal_entries_totals_non_negative check (total_debit >= 0 and total_credit >= 0),
  constraint journal_entries_balanced check (total_debit = total_credit)
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  description varchar(255),
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  phone_unit_id uuid references public.phone_units(id),
  seller_id uuid references public.sellers(id),
  customer_id uuid references public.customers(id),
  notes text,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_lines_amounts_non_negative check (debit >= 0 and credit >= 0),
  constraint journal_lines_debit_credit_exclusive check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_time timestamptz not null default now(),
  action varchar(30) not null,
  entity_table varchar(80) not null,
  entity_id uuid,
  actor_user_id uuid,
  actor_email varchar(255),
  actor_role varchar(50),
  reason text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  request_path text,
  request_method varchar(10),
  created_at timestamptz not null default now(),
  constraint audit_logs_action_allowed check (
    action in ('CREATE', 'UPDATE', 'ACCEPT', 'REJECT', 'SALE', 'REVERSAL')
  )
);

create index if not exists phone_models_brand_id_idx on public.phone_models(brand_id);
create index if not exists colors_brand_id_idx on public.colors(brand_id);
create index if not exists inspection_items_category_idx on public.inspection_items(category);
create index if not exists inspection_items_brand_id_idx on public.inspection_items(applies_to_brand_id);
create index if not exists sellers_name_idx on public.sellers(name);
create index if not exists customers_name_idx on public.customers(name);
create index if not exists accounts_type_idx on public.accounts(account_type);
create index if not exists cost_categories_scope_idx on public.cost_categories(scope);
create index if not exists unit_receipts_receipt_date_idx on public.unit_receipts(receipt_date);
create index if not exists unit_receipts_seller_id_idx on public.unit_receipts(seller_id);
create index if not exists unit_receipts_status_idx on public.unit_receipts(status);
create index if not exists phone_units_stock_status_idx on public.phone_units(stock_status);
create index if not exists phone_units_brand_model_idx on public.phone_units(brand_id, model_id);
create index if not exists phone_units_acquired_at_idx on public.phone_units(acquired_at);
create index if not exists phone_units_total_unit_cost_idx on public.phone_units(total_unit_cost);
create index if not exists phone_units_current_listing_price_idx on public.phone_units(current_listing_price);
create index if not exists phone_units_imei_1_idx on public.phone_units(imei_1);
create index if not exists phone_units_serial_number_idx on public.phone_units(serial_number);
create index if not exists unit_inspection_results_receipt_id_idx on public.unit_inspection_results(receipt_id);
create index if not exists unit_inspection_results_phone_unit_id_idx on public.unit_inspection_results(phone_unit_id);
create index if not exists unit_accessories_phone_unit_id_idx on public.unit_accessories(phone_unit_id);
create index if not exists unit_photos_phone_unit_id_idx on public.unit_photos(phone_unit_id);
create index if not exists unit_costs_phone_unit_id_idx on public.unit_costs(phone_unit_id);
create index if not exists unit_costs_cost_category_id_idx on public.unit_costs(cost_category_id);
create index if not exists unit_costs_cost_date_idx on public.unit_costs(cost_date);
create index if not exists unit_costs_payment_account_id_idx on public.unit_costs(payment_account_id);
create index if not exists unit_price_histories_phone_unit_id_idx on public.unit_price_histories(phone_unit_id);
create index if not exists unit_price_histories_effective_at_idx on public.unit_price_histories(effective_at);
create index if not exists sales_sale_date_idx on public.sales(sale_date);
create index if not exists sales_customer_id_idx on public.sales(customer_id);
create index if not exists sales_sales_channel_id_idx on public.sales(sales_channel_id);
create index if not exists sales_status_idx on public.sales(status);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sale_items_phone_unit_id_idx on public.sale_items(phone_unit_id);
drop index if exists sale_items_active_phone_unit_unique_idx;
create index if not exists sale_costs_sale_id_idx on public.sale_costs(sale_id);
create index if not exists sale_costs_sale_item_id_idx on public.sale_costs(sale_item_id);
create index if not exists sale_costs_cost_category_id_idx on public.sale_costs(cost_category_id);
create index if not exists sale_returns_sale_id_idx on public.sale_returns(sale_id);
create index if not exists sale_returns_return_date_idx on public.sale_returns(return_date);
create index if not exists sale_returns_target_stock_status_idx on public.sale_returns(target_stock_status);
create index if not exists capital_contributions_date_idx on public.capital_contributions(contribution_date);
create index if not exists capital_contributions_account_id_idx on public.capital_contributions(account_id);
create index if not exists owner_drawings_date_idx on public.owner_drawings(drawing_date);
create index if not exists owner_drawings_account_id_idx on public.owner_drawings(account_id);
create index if not exists operating_expenses_date_idx on public.operating_expenses(expense_date);
create index if not exists operating_expenses_payment_account_id_idx on public.operating_expenses(payment_account_id);
create index if not exists operating_expenses_expense_account_id_idx on public.operating_expenses(expense_account_id);
create index if not exists cash_adjustments_date_idx on public.cash_adjustments(adjustment_date);
create index if not exists cash_adjustments_account_id_idx on public.cash_adjustments(account_id);
create index if not exists cash_adjustments_type_idx on public.cash_adjustments(adjustment_type);
create index if not exists journal_entries_transaction_date_idx on public.journal_entries(transaction_date);
create index if not exists journal_entries_source_idx on public.journal_entries(source_module, source_id);
create index if not exists journal_entries_status_idx on public.journal_entries(status);
create index if not exists journal_lines_journal_entry_id_idx on public.journal_lines(journal_entry_id);
create index if not exists journal_lines_account_id_idx on public.journal_lines(account_id);
create index if not exists journal_lines_phone_unit_id_idx on public.journal_lines(phone_unit_id);
create index if not exists audit_logs_event_time_idx on public.audit_logs(event_time desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_table, entity_id);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);

create unique index if not exists phone_units_active_imei_1_unique_idx
on public.phone_units (imei_1)
where deleted_at is null and stock_status <> 'REJECTED';

create unique index if not exists unit_photos_primary_unique_idx
on public.unit_photos (phone_unit_id)
where is_primary = true and deleted_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'unit_receipts_journal_entry_id_fkey'
  ) then
    alter table public.unit_receipts
      add constraint unit_receipts_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'unit_costs_journal_entry_id_fkey'
  ) then
    alter table public.unit_costs
      add constraint unit_costs_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_journal_entry_id_fkey'
  ) then
    alter table public.sales
      add constraint sales_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sale_returns_reversed_sale_journal_entry_id_fkey'
  ) then
    alter table public.sale_returns
      add constraint sale_returns_reversed_sale_journal_entry_id_fkey
      foreign key (reversed_sale_journal_entry_id) references public.journal_entries(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sale_returns_journal_entry_id_fkey'
  ) then
    alter table public.sale_returns
      add constraint sale_returns_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'capital_contributions_journal_entry_id_fkey'
  ) then
    alter table public.capital_contributions
      add constraint capital_contributions_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'owner_drawings_journal_entry_id_fkey'
  ) then
    alter table public.owner_drawings
      add constraint owner_drawings_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'operating_expenses_journal_entry_id_fkey'
  ) then
    alter table public.operating_expenses
      add constraint operating_expenses_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cash_adjustments_journal_entry_id_fkey'
  ) then
    alter table public.cash_adjustments
      add constraint cash_adjustments_journal_entry_id_fkey
      foreign key (journal_entry_id) references public.journal_entries(id);
  end if;
end;
$$;

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

create or replace trigger unit_receipts_set_updated_at
before update on public.unit_receipts
for each row execute function public.set_updated_at();

create or replace trigger phone_units_set_updated_at
before update on public.phone_units
for each row execute function public.set_updated_at();

create or replace trigger unit_inspection_results_set_updated_at
before update on public.unit_inspection_results
for each row execute function public.set_updated_at();

create or replace trigger unit_accessories_set_updated_at
before update on public.unit_accessories
for each row execute function public.set_updated_at();

create or replace trigger unit_photos_set_updated_at
before update on public.unit_photos
for each row execute function public.set_updated_at();

create or replace trigger unit_costs_set_updated_at
before update on public.unit_costs
for each row execute function public.set_updated_at();

create or replace trigger unit_price_histories_set_updated_at
before update on public.unit_price_histories
for each row execute function public.set_updated_at();

create or replace trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create or replace trigger sale_items_set_updated_at
before update on public.sale_items
for each row execute function public.set_updated_at();

create or replace trigger sale_costs_set_updated_at
before update on public.sale_costs
for each row execute function public.set_updated_at();

create or replace trigger sale_returns_set_updated_at
before update on public.sale_returns
for each row execute function public.set_updated_at();

create or replace trigger capital_contributions_set_updated_at
before update on public.capital_contributions
for each row execute function public.set_updated_at();

create or replace trigger owner_drawings_set_updated_at
before update on public.owner_drawings
for each row execute function public.set_updated_at();

create or replace trigger operating_expenses_set_updated_at
before update on public.operating_expenses
for each row execute function public.set_updated_at();

create or replace trigger cash_adjustments_set_updated_at
before update on public.cash_adjustments
for each row execute function public.set_updated_at();

create or replace trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

create or replace trigger journal_lines_set_updated_at
before update on public.journal_lines
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
alter table public.unit_receipts enable row level security;
alter table public.phone_units enable row level security;
alter table public.unit_inspection_results enable row level security;
alter table public.unit_accessories enable row level security;
alter table public.unit_photos enable row level security;
alter table public.unit_costs enable row level security;
alter table public.unit_price_histories enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_costs enable row level security;
alter table public.sale_returns enable row level security;
alter table public.capital_contributions enable row level security;
alter table public.owner_drawings enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.cash_adjustments enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.audit_logs enable row level security;

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

drop policy if exists "Unit receipts are readable" on public.unit_receipts;
create policy "Unit receipts are readable" on public.unit_receipts for select using (deleted_at is null);

drop policy if exists "Phone units are readable" on public.phone_units;
create policy "Phone units are readable" on public.phone_units for select using (deleted_at is null);

drop policy if exists "Unit inspection results are readable" on public.unit_inspection_results;
create policy "Unit inspection results are readable" on public.unit_inspection_results for select using (deleted_at is null);

drop policy if exists "Unit accessories are readable" on public.unit_accessories;
create policy "Unit accessories are readable" on public.unit_accessories for select using (deleted_at is null);

drop policy if exists "Unit photos are readable" on public.unit_photos;
create policy "Unit photos are readable" on public.unit_photos for select using (deleted_at is null);

drop policy if exists "Unit costs are readable" on public.unit_costs;
create policy "Unit costs are readable" on public.unit_costs for select using (deleted_at is null);

drop policy if exists "Unit price histories are readable" on public.unit_price_histories;
create policy "Unit price histories are readable" on public.unit_price_histories for select using (deleted_at is null);

drop policy if exists "Sales are readable" on public.sales;
create policy "Sales are readable" on public.sales for select using (deleted_at is null);

drop policy if exists "Sale items are readable" on public.sale_items;
create policy "Sale items are readable" on public.sale_items for select using (deleted_at is null);

drop policy if exists "Sale costs are readable" on public.sale_costs;
create policy "Sale costs are readable" on public.sale_costs for select using (deleted_at is null);

drop policy if exists "Sale returns are readable" on public.sale_returns;
create policy "Sale returns are readable" on public.sale_returns for select using (deleted_at is null);

drop policy if exists "Capital contributions are readable" on public.capital_contributions;
create policy "Capital contributions are readable" on public.capital_contributions for select using (deleted_at is null);

drop policy if exists "Owner drawings are readable" on public.owner_drawings;
create policy "Owner drawings are readable" on public.owner_drawings for select using (deleted_at is null);

drop policy if exists "Operating expenses are readable" on public.operating_expenses;
create policy "Operating expenses are readable" on public.operating_expenses for select using (deleted_at is null);

drop policy if exists "Cash adjustments are readable" on public.cash_adjustments;
create policy "Cash adjustments are readable" on public.cash_adjustments for select using (deleted_at is null);

drop policy if exists "Journal entries are readable" on public.journal_entries;
create policy "Journal entries are readable" on public.journal_entries for select using (deleted_at is null);

drop policy if exists "Journal lines are readable" on public.journal_lines;
create policy "Journal lines are readable" on public.journal_lines for select using (deleted_at is null);

drop policy if exists "Audit logs are readable" on public.audit_logs;
create policy "Audit logs are readable" on public.audit_logs
for select using (
  auth.role() = 'authenticated'
  and upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'OWNER'
);

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
