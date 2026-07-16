import type { PhoneUnitRecord, ReceiptRecord } from "@/lib/receipts/receipt-ui-types";

export type InventoryUnit = PhoneUnitRecord & {
  created_at: string;
  updated_at: string;
};

export type UnitCostRecord = {
  id: string;
  cost_number: string;
  phone_unit_id: string;
  cost_category_id: string;
  cost_date: string;
  description: string;
  amount: number;
  payment_account_id: string | null;
  is_paid: boolean;
  proof_url: string | null;
  proof_filename: string | null;
  journal_entry_id: string | null;
  notes: string | null;
  created_at: string;
};

export type UnitPriceHistoryRecord = {
  id: string;
  phone_unit_id: string;
  listing_price: number;
  minimum_price: number;
  estimated_profit_at_listing: number;
  estimated_profit_at_minimum: number;
  reason: string | null;
  effective_at: string;
  notes: string | null;
  created_at: string;
};

export type InventoryUnitDetail = {
  unit: InventoryUnit;
  receipt: ReceiptRecord | null;
  costs: UnitCostRecord[];
  price_histories: UnitPriceHistoryRecord[];
};

export type CostCategoryOption = {
  id: string;
  code: string;
  name: string;
  scope: "UNIT" | "OPERATING" | "SALES";
  inventory_account_id: string | null;
};

export type AccountOption = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  is_cash_account: boolean;
};
