import type { InventoryUnit } from "@/lib/inventory/inventory-ui-types";

export type SaleStatus = "DRAFT" | "COMPLETED" | "CANCELLED" | "RETURNED";
export type SalePaymentMethod = "CASH" | "TRANSFER" | "MARKETPLACE" | "OTHER";
export type SaleReturnTargetStockStatus = "IN_STOCK" | "SERVICE" | "DAMAGED";

export type SaleRecord = {
  id: string;
  sale_number: string;
  sale_date: string;
  customer_id: string;
  sales_channel_id: string | null;
  status: SaleStatus;
  payment_account_id: string | null;
  payment_method: SalePaymentMethod | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  payment_proof_filename: string | null;
  payment_proof_recorded_at: string | null;
  completed_at: string | null;
  subtotal_amount: number;
  total_sales_cost: number;
  total_net_amount: number;
  total_cogs_amount: number;
  total_profit_amount: number;
  journal_entry_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleListItem = Pick<
  SaleRecord,
  | "id"
  | "sale_number"
  | "sale_date"
  | "customer_id"
  | "sales_channel_id"
  | "status"
  | "payment_account_id"
  | "payment_method"
  | "payment_reference"
  | "payment_proof_url"
  | "completed_at"
  | "subtotal_amount"
  | "total_sales_cost"
  | "total_net_amount"
  | "total_cogs_amount"
  | "total_profit_amount"
  | "journal_entry_id"
  | "notes"
  | "created_at"
  | "updated_at"
>;

export type SaleItemRecord = {
  id: string;
  sale_id: string;
  phone_unit_id: string;
  listing_price: number | null;
  minimum_price: number | null;
  final_price: number;
  unit_cost: number;
  sales_cost_amount: number;
  net_amount: number;
  profit_amount: number;
  notes: string | null;
  created_at: string;
};

export type SaleCostRecord = {
  id: string;
  sale_id: string;
  sale_item_id: string | null;
  cost_category_id: string;
  description: string;
  amount: number;
  payment_account_id: string | null;
  notes: string | null;
  created_at: string;
};

export type SaleReturnRecord = {
  id: string;
  return_number: string;
  sale_id: string;
  return_date: string;
  status: "COMPLETED" | "CANCELLED";
  target_stock_status: SaleReturnTargetStockStatus;
  return_reason_code: string | null;
  return_notes: string | null;
  refund_amount: number;
  refund_account_id: string | null;
  refund_reference: string | null;
  refund_proof_url: string | null;
  refund_proof_filename: string | null;
  refund_recorded_at: string | null;
  reversed_sale_journal_entry_id: string | null;
  journal_entry_id: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type SaleDetail = {
  sale: SaleRecord;
  items: SaleItemRecord[];
  costs: SaleCostRecord[];
  returns: SaleReturnRecord[];
  units: InventoryUnit[];
};

export type CustomerOption = {
  id: string;
  customer_code: string;
  name: string;
  phone: string | null;
  city: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  is_active: boolean;
};

export type SalesChannelOption = {
  id: string;
  code: string;
  name: string;
  default_fee_type: "NONE" | "FIXED" | "PERCENTAGE";
  default_fee_value: number;
};
