import type { AccountBalance } from "@/lib/finance-ui/finance-ui-types";
import type { InventoryUnit } from "@/lib/inventory/inventory-ui-types";

export type LedgerLine = {
  journal_entry_id: string;
  journal_number: string;
  transaction_date: string;
  source_module: string;
  source_id: string;
  journal_description: string;
  status: string;
  line_id: string;
  line_description: string | null;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: "DEBIT" | "CREDIT";
  debit: number;
  credit: number;
  signed_amount: number;
  running_balance: number;
};

export type LedgerResponse = {
  lines: LedgerLine[];
  count: number;
};

export type BalancesResponse = {
  accounts: AccountBalance[];
  summary: {
    total_debit: number;
    total_credit: number;
  };
};

export type DashboardReport = {
  cards: {
    inventory_units: number;
    inventory_value: number;
    units_sold: number;
    sales_revenue: number;
    gross_profit: number;
    net_profit: number;
    cash_balance: number;
    balance_sheet_balanced: boolean;
  };
};

export type InventoryReport = {
  summary: {
    total_units: number;
    active_inventory_units: number;
    total_inventory_value: number;
    total_listing_value: number;
  };
  by_status: Array<{
    stock_status: string;
    unit_count: number;
    total_unit_cost: number;
    total_listing_price: number;
    total_minimum_price: number;
  }>;
  units: InventoryUnit[];
};

export type UnitProfitabilityReport = {
  summary: {
    units_sold: number;
    gross_sales: number;
    sales_cost: number;
    net_sales: number;
    total_unit_cost: number;
    total_profit: number;
  };
  units: Array<{
    sale_id: string;
    sale_number: string | null;
    sale_date: string | null;
    sale_status: string | null;
    stock_code: string | null;
    stock_status: string | null;
    final_price: number;
    unit_cost: number;
    sales_cost_amount: number;
    net_amount: number;
    profit_amount: number;
    margin_percent: number;
  }>;
};

export type ProfitLossReport = {
  revenue: AccountBalance[];
  cogs: AccountBalance[];
  expenses: AccountBalance[];
  summary: {
    revenue: number;
    cogs: number;
    gross_profit: number;
    operating_expenses: number;
    net_profit: number;
  };
};

export type BalanceSheetLine = {
  account_id: string | null;
  account_code: string;
  account_name: string;
  amount: number;
};

export type BalanceSheetReport = {
  as_of: string | null;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  summary: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    liabilities_and_equity: number;
    current_earnings: number;
  };
  balance_check: {
    is_balanced: boolean;
    difference: number;
  };
};

export type CashFlowReport = {
  operating: CashFlowSection;
  financing: CashFlowSection;
  adjustments: CashFlowSection;
  other: CashFlowSection;
  summary: {
    net_cash_flow: number;
    ending_cash_balance: number;
  };
  lines: Array<LedgerLine & { cash_flow_category: string; cash_flow_amount: number }>;
};

export type CashFlowSection = {
  section: string;
  cash_in: number;
  cash_out: number;
  net_amount: number;
};
