-- Development seed data for Rephone POS.
-- Run after supabase/schema.sql in a non-production database.

insert into public.sellers (
  seller_code,
  name,
  phone,
  city,
  source_channel
)
values (
  'DEV-SELLER-001',
  'Dev Seller',
  '081234567890',
  'Jakarta',
  'Development Seed'
)
on conflict (seller_code) do update
set
  name = excluded.name,
  phone = excluded.phone,
  city = excluded.city,
  source_channel = excluded.source_channel,
  is_active = true;

insert into public.customers (
  customer_code,
  name,
  phone,
  city
)
values (
  'DEV-CUSTOMER-001',
  'Dev Customer',
  '081298765432',
  'Jakarta'
)
on conflict (customer_code) do update
set
  name = excluded.name,
  phone = excluded.phone,
  city = excluded.city,
  is_active = true;

insert into public.unit_receipts (
  receipt_number,
  receipt_date,
  seller_id,
  status,
  purchase_account_id,
  purchase_payment_reference,
  purchase_payment_proof_url,
  photo_drive_url,
  photo_drive_url_type,
  total_purchase_amount,
  total_direct_cost,
  total_unit_cost,
  notes
)
select
  'DEV-RCP-001',
  current_date,
  seller.id,
  'DRAFT',
  account.id,
  'DEV-PAYMENT-001',
  'https://drive.google.com/file/d/dev-payment-proof/view',
  'https://drive.google.com/drive/folders/dev-unit-photos',
  'FOLDER',
  4500000,
  10000,
  4510000,
  'Development seed receipt'
from public.sellers seller
cross join public.accounts account
where seller.seller_code = 'DEV-SELLER-001'
  and account.account_code = '1102'
on conflict (receipt_number) do update
set
  seller_id = excluded.seller_id,
  purchase_account_id = excluded.purchase_account_id,
  purchase_payment_reference = excluded.purchase_payment_reference,
  purchase_payment_proof_url = excluded.purchase_payment_proof_url,
  photo_drive_url = excluded.photo_drive_url,
  total_purchase_amount = excluded.total_purchase_amount,
  total_direct_cost = excluded.total_direct_cost,
  total_unit_cost = excluded.total_unit_cost,
  notes = excluded.notes;

insert into public.phone_units (
  receipt_id,
  stock_code,
  stock_status,
  brand_id,
  model_id,
  storage_variant_id,
  color_id,
  imei_1,
  imei_2,
  sim_type,
  battery_health,
  icloud_status,
  find_my_status,
  imei_status,
  purchase_price,
  purchase_transfer_fee,
  total_unit_cost,
  current_listing_price,
  minimum_price,
  photo_drive_url,
  acquired_at,
  notes
)
select
  receipt.id,
  'DEV-STK-001',
  'DRAFT',
  brand.id,
  model.id,
  storage.id,
  color.id,
  '123456789012345',
  '123456789012346',
  'DUAL',
  90,
  'CLEAN',
  'OFF',
  'ACTIVE',
  4500000,
  10000,
  4510000,
  5400000,
  5100000,
  'https://drive.google.com/drive/folders/dev-unit-photos',
  current_date,
  'Development seed unit'
from public.unit_receipts receipt
join public.brands brand on brand.code = 'APPLE'
join public.phone_models model on model.model_code = 'IPHONE_13'
join public.storage_variants storage on storage.capacity_gb = 128
left join public.colors color on color.brand_id is null and color.name = 'Black'
where receipt.receipt_number = 'DEV-RCP-001'
on conflict (stock_code) do update
set
  receipt_id = excluded.receipt_id,
  stock_status = excluded.stock_status,
  brand_id = excluded.brand_id,
  model_id = excluded.model_id,
  storage_variant_id = excluded.storage_variant_id,
  color_id = excluded.color_id,
  imei_1 = excluded.imei_1,
  imei_2 = excluded.imei_2,
  total_unit_cost = excluded.total_unit_cost,
  current_listing_price = excluded.current_listing_price,
  minimum_price = excluded.minimum_price,
  photo_drive_url = excluded.photo_drive_url,
  notes = excluded.notes;

insert into public.unit_accessories (
  phone_unit_id,
  accessory_type_id,
  is_included,
  condition_notes
)
select
  unit.id,
  accessory.id,
  accessory.code in ('UNIT', 'BOX', 'CABLE'),
  'Development seed accessory'
from public.phone_units unit
cross join public.accessory_types accessory
where unit.stock_code = 'DEV-STK-001'
  and accessory.code in ('UNIT', 'BOX', 'CABLE', 'CHARGER')
on conflict (phone_unit_id, accessory_type_id) do update
set
  is_included = excluded.is_included,
  condition_notes = excluded.condition_notes;

insert into public.unit_photos (
  phone_unit_id,
  photo_type,
  drive_url,
  file_name,
  sort_order,
  is_primary,
  notes
)
select
  unit.id,
  'FRONT',
  'https://drive.google.com/file/d/dev-unit-front-photo/view',
  'dev-unit-front.jpg',
  1,
  true,
  'Development seed photo'
from public.phone_units unit
where unit.stock_code = 'DEV-STK-001'
on conflict do nothing;
