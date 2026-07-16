export type AccountOption = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "COGS" | "EXPENSE";
  account_subtype: string;
  is_cash_account: boolean;
};

export type CostCategoryOption = {
  id: string;
  code: string;
  name: string;
  scope: "UNIT" | "OPERATING" | "SALES";
  expense_account_id: string | null;
  inventory_account_id: string | null;
};

export type AccountBalance = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountOption["account_type"];
  account_subtype: string;
  normal_balance: "DEBIT" | "CREDIT";
  is_cash_account: boolean;
  total_debit: number;
  total_credit: number;
  balance: number;
};

export type AccountBalancesResponse = {
  accounts: AccountBalance[];
};
