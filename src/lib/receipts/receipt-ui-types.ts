export type ReceiptStatus = "DRAFT" | "INSPECTION" | "ACCEPTED" | "REJECTED";

export type ReceiptListItem = {
  id: string;
  receipt_number: string;
  receipt_date: string;
  seller_id: string;
  status: ReceiptStatus;
  total_purchase_amount: number;
  total_direct_cost: number;
  total_unit_cost: number;
  photo_drive_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ReceiptRecord = ReceiptListItem & {
  decision_at: string | null;
  rejection_reason_code: string | null;
  rejection_notes: string | null;
  purchase_account_id: string | null;
  purchase_payment_reference: string | null;
  purchase_payment_proof_url: string | null;
  purchase_payment_proof_filename: string | null;
  purchase_payment_proof_recorded_at: string | null;
  photo_drive_url_type: string | null;
  notes: string | null;
  journal_entry_id: string | null;
};

export type PhoneUnitRecord = {
  id: string;
  receipt_id: string | null;
  stock_code: string;
  stock_status: string;
  brand_id: string;
  model_id: string;
  storage_variant_id: string | null;
  color_id: string | null;
  physical_condition_id: string | null;
  imei_1: string;
  imei_2: string | null;
  serial_number: string | null;
  sim_type: string | null;
  battery_health: number | null;
  cycle_count: number | null;
  icloud_status: string | null;
  google_account_status: string | null;
  find_my_status: string | null;
  imei_status: string | null;
  mdm_status: string | null;
  purchase_price: number;
  purchase_transfer_fee: number;
  total_unit_cost: number;
  current_listing_price: number | null;
  minimum_price: number | null;
  minus_notes: string | null;
  internal_notes: string | null;
  photo_drive_url: string | null;
  acquired_at: string | null;
  sold_at: string | null;
  notes: string | null;
};

export type InspectionResultRecord = {
  id: string;
  receipt_id: string;
  phone_unit_id: string;
  inspection_item_id: string;
  result_status: string | null;
  boolean_value: boolean | null;
  number_value: number | null;
  text_value: string | null;
  notes: string | null;
};

export type UnitAccessoryRecord = {
  id: string;
  phone_unit_id: string;
  accessory_type_id: string;
  is_included: boolean;
  condition_notes: string | null;
};

export type UnitPhotoRecord = {
  id: string;
  phone_unit_id: string;
  photo_type: string;
  drive_url: string;
  file_name: string | null;
  sort_order: number;
  is_primary: boolean;
  notes: string | null;
};

export type ReceiptDetail = {
  receipt: ReceiptRecord;
  units: PhoneUnitRecord[];
  inspections: InspectionResultRecord[];
  accessories: UnitAccessoryRecord[];
  photos: UnitPhotoRecord[];
};

export type SellerOption = {
  id: string;
  seller_code: string;
  name: string;
  phone: string | null;
  city: string | null;
  risk_flag: boolean;
};

export type BrandOption = {
  id: string;
  code: string;
  name: string;
};

export type ModelOption = {
  id: string;
  brand_id: string;
  model_code: string;
  model_name: string;
  default_sim_type: string | null;
  default_os: string | null;
};

export type StorageOption = {
  id: string;
  label: string;
};

export type ColorOption = {
  id: string;
  brand_id: string | null;
  name: string;
  hex_code: string | null;
};

export type PhysicalConditionOption = {
  id: string;
  code: string;
  name: string;
};

export type AccessoryTypeOption = {
  id: string;
  code: string;
  name: string;
};

export type InspectionItemOption = {
  id: string;
  code: string;
  category: string;
  name: string;
  input_type: "STATUS" | "BOOLEAN" | "NUMBER" | "TEXT";
  unit_label: string | null;
  is_required: boolean;
  applies_to_brand_id: string | null;
};

export type BankAccountOption = {
  id: string;
  account_id: string;
  bank_name: string;
  account_number_masked: string | null;
  account_holder: string;
  is_default_purchase: boolean;
};

export type ReceiptReferences = {
  sellers: SellerOption[];
  brands: BrandOption[];
  models: ModelOption[];
  storageVariants: StorageOption[];
  colors: ColorOption[];
  physicalConditions: PhysicalConditionOption[];
  accessoryTypes: AccessoryTypeOption[];
  inspectionItems: InspectionItemOption[];
  bankAccounts: BankAccountOption[];
};
