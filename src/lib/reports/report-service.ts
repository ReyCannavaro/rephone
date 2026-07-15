import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getAccountBalances,
  getLedgerLines,
  type AccountBalance,
} from "@/lib/ledger/ledger-service";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type PhoneUnitRow = Database["public"]["Tables"]["phone_units"]["Row"];
type JournalSourceModule = Database["public"]["Tables"]["journal_entries"]["Row"]["source_module"];

export type ReportPeriod = {
  date_from: string | null;
  date_to: string | null;
  as_of: string | null;
};

export type ReportResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

const operatingSourceModules: JournalSourceModule[] = [
  "RECEIPT",
  "UNIT_COST",
  "SALE",
  "SALE_RETURN",
  "OPERATING_EXPENSE",
];
const financingSourceModules: JournalSourceModule[] = ["CAPITAL", "OWNER_DRAWING"];

export async function getDashboardReport(supabase: Supabase, period: ReportPeriod) {
  const [inventory, unitProfitability, profitLoss, balanceSheet, cashFlow] = await Promise.all([
    getInventoryReport(supabase),
    getUnitProfitabilityReport(supabase, period),
    getProfitLossReport(supabase, period),
    getBalanceSheetReport(supabase, period),
    getCashFlowReport(supabase, period),
  ]);

  const error =
    inventory.error ??
    unitProfitability.error ??
    profitLoss.error ??
    balanceSheet.error ??
    cashFlow.error;

  if (error) {
    return { error };
  }

  if (!inventory.data || !unitProfitability.data || !profitLoss.data || !balanceSheet.data || !cashFlow.data) {
    return { error: "Dashboard report data was not returned." };
  }

  return {
    data: {
      period,
      cards: {
        inventory_units: inventory.data.summary.total_units,
        inventory_value: inventory.data.summary.total_inventory_value,
        units_sold: unitProfitability.data.summary.units_sold,
        sales_revenue: profitLoss.data.summary.revenue,
        gross_profit: profitLoss.data.summary.gross_profit,
        net_profit: profitLoss.data.summary.net_profit,
        cash_balance: cashFlow.data.summary.ending_cash_balance,
        balance_sheet_balanced: balanceSheet.data.balance_check.is_balanced,
      },
      inventory: inventory.data.summary,
      sales: unitProfitability.data.summary,
      profit_loss: profitLoss.data.summary,
      balance_sheet: balanceSheet.data.summary,
      cash_flow: cashFlow.data.summary,
    },
  };
}

export async function getInventoryReport(supabase: Supabase) {
  const unitsResult = await supabase
    .from("phone_units")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (unitsResult.error) {
    return { error: unitsResult.error.message };
  }

  const units = unitsResult.data ?? [];
  const byStatus = new Map<
    PhoneUnitRow["stock_status"],
    {
      stock_status: PhoneUnitRow["stock_status"];
      unit_count: number;
      total_unit_cost: number;
      total_listing_price: number;
      total_minimum_price: number;
    }
  >();

  for (const unit of units) {
    const current =
      byStatus.get(unit.stock_status) ??
      {
        stock_status: unit.stock_status,
        unit_count: 0,
        total_unit_cost: 0,
        total_listing_price: 0,
        total_minimum_price: 0,
      };

    current.unit_count += 1;
    current.total_unit_cost = roundMoney(current.total_unit_cost + unit.total_unit_cost);
    current.total_listing_price = roundMoney(current.total_listing_price + (unit.current_listing_price ?? 0));
    current.total_minimum_price = roundMoney(current.total_minimum_price + (unit.minimum_price ?? 0));
    byStatus.set(unit.stock_status, current);
  }

  const stockStatusesInInventory: PhoneUnitRow["stock_status"][] = ["IN_STOCK", "RESERVED", "SERVICE", "DAMAGED"];
  const inventoryUnits = units.filter((unit) => stockStatusesInInventory.includes(unit.stock_status));

  return {
    data: {
      summary: {
        total_units: units.length,
        active_inventory_units: inventoryUnits.length,
        total_inventory_value: roundMoney(
          inventoryUnits.reduce((sum, unit) => sum + unit.total_unit_cost, 0),
        ),
        total_listing_value: roundMoney(
          inventoryUnits.reduce((sum, unit) => sum + (unit.current_listing_price ?? 0), 0),
        ),
      },
      by_status: [...byStatus.values()].sort((a, b) => a.stock_status.localeCompare(b.stock_status)),
      units,
    },
  };
}

export async function getUnitProfitabilityReport(supabase: Supabase, period: ReportPeriod) {
  let salesQuery = supabase
    .from("sales")
    .select("*")
    .in("status", ["COMPLETED", "RETURNED"])
    .is("deleted_at", null)
    .order("sale_date", { ascending: false });

  if (period.date_from) {
    salesQuery = salesQuery.gte("sale_date", period.date_from);
  }

  if (period.date_to) {
    salesQuery = salesQuery.lte("sale_date", period.date_to);
  }

  const salesResult = await salesQuery;

  if (salesResult.error) {
    return { error: salesResult.error.message };
  }

  const sales = salesResult.data ?? [];

  if (sales.length === 0) {
    return {
      data: {
        period,
        summary: emptyUnitProfitabilitySummary(),
        units: [],
      },
    };
  }

  const saleIds = sales.map((sale) => sale.id);
  const itemsResult = await supabase
    .from("sale_items")
    .select("*")
    .in("sale_id", saleIds)
    .is("deleted_at", null);

  if (itemsResult.error) {
    return { error: itemsResult.error.message };
  }

  const items = itemsResult.data ?? [];
  const unitIds = [...new Set(items.map((item) => item.phone_unit_id))];
  const unitsById = await fetchPhoneUnitsById(supabase, unitIds);

  if (unitsById.error) {
    return unitsById;
  }

  if (!unitsById.data) {
    return { error: "Phone unit data was not returned." };
  }

  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const rows = items.map((item) => {
    const sale = salesById.get(item.sale_id);
    const unit = unitsById.data.get(item.phone_unit_id);

    return {
      sale_id: item.sale_id,
      sale_number: sale?.sale_number ?? null,
      sale_date: sale?.sale_date ?? null,
      sale_status: sale?.status ?? null,
      phone_unit_id: item.phone_unit_id,
      stock_code: unit?.stock_code ?? null,
      stock_status: unit?.stock_status ?? null,
      final_price: item.final_price,
      unit_cost: item.unit_cost,
      sales_cost_amount: item.sales_cost_amount,
      net_amount: item.net_amount,
      profit_amount: item.profit_amount,
      margin_percent: item.net_amount > 0 ? roundMoney((item.profit_amount / item.net_amount) * 100) : 0,
    };
  });

  return {
    data: {
      period,
      summary: {
        units_sold: rows.length,
        gross_sales: roundMoney(rows.reduce((sum, row) => sum + row.final_price, 0)),
        sales_cost: roundMoney(rows.reduce((sum, row) => sum + row.sales_cost_amount, 0)),
        net_sales: roundMoney(rows.reduce((sum, row) => sum + row.net_amount, 0)),
        total_unit_cost: roundMoney(rows.reduce((sum, row) => sum + row.unit_cost, 0)),
        total_profit: roundMoney(rows.reduce((sum, row) => sum + row.profit_amount, 0)),
      },
      units: rows,
    },
  };
}

export async function getProfitLossReport(supabase: Supabase, period: ReportPeriod) {
  const balancesResult = await getAccountBalances(supabase, {
    date_from: period.date_from,
    date_to: period.date_to,
    status: "POSTED",
    include_inactive: true,
  });

  if (balancesResult.error) {
    return { error: balancesResult.error };
  }

  if (!balancesResult.data) {
    return { error: "Profit/loss balances were not returned." };
  }

  const revenue = filterNonZeroBalances(balancesResult.data, "REVENUE");
  const cogs = filterNonZeroBalances(balancesResult.data, "COGS");
  const expenses = filterNonZeroBalances(balancesResult.data, "EXPENSE");
  const totalRevenue = sumBalance(revenue);
  const totalCogs = sumBalance(cogs);
  const totalExpenses = sumBalance(expenses);
  const grossProfit = roundMoney(totalRevenue - totalCogs);
  const netProfit = roundMoney(grossProfit - totalExpenses);

  return {
    data: {
      period,
      revenue,
      cogs,
      expenses,
      summary: {
        revenue: totalRevenue,
        cogs: totalCogs,
        gross_profit: grossProfit,
        operating_expenses: totalExpenses,
        net_profit: netProfit,
      },
    },
  };
}

export async function getBalanceSheetReport(supabase: Supabase, period: ReportPeriod) {
  const asOf = period.as_of ?? period.date_to;
  const balancesResult = await getAccountBalances(supabase, {
    date_to: asOf,
    status: "POSTED",
    include_inactive: true,
  });

  if (balancesResult.error) {
    return { error: balancesResult.error };
  }

  if (!balancesResult.data) {
    return { error: "Balance sheet balances were not returned." };
  }

  const balances = balancesResult.data.filter(
    (balance) => balance.balance !== 0 || balance.total_debit !== 0 || balance.total_credit !== 0,
  );
  const assets = balances.filter((balance) => balance.account_type === "ASSET").map(toBalanceSheetLine);
  const liabilities = balances.filter((balance) => balance.account_type === "LIABILITY").map(toBalanceSheetLine);
  const equity = balances.filter((balance) => balance.account_type === "EQUITY").map(toBalanceSheetLine);
  const incomeStatementBalances = balances.filter((balance) =>
    ["REVENUE", "COGS", "EXPENSE"].includes(balance.account_type),
  );
  const currentEarnings = calculateCurrentEarnings(incomeStatementBalances);
  const totalAssets = roundMoney(assets.reduce((sum, line) => sum + line.amount, 0));
  const totalLiabilities = roundMoney(liabilities.reduce((sum, line) => sum + line.amount, 0));
  const totalEquityBeforeEarnings = roundMoney(equity.reduce((sum, line) => sum + line.amount, 0));
  const totalEquity = roundMoney(totalEquityBeforeEarnings + currentEarnings);
  const liabilitiesAndEquity = roundMoney(totalLiabilities + totalEquity);
  const difference = roundMoney(totalAssets - liabilitiesAndEquity);

  return {
    data: {
      as_of: asOf,
      assets,
      liabilities,
      equity: [
        ...equity,
        {
          account_id: null,
          account_code: "CURRENT_EARNINGS",
          account_name: "Laba Tahun Berjalan (belum ditutup)",
          amount: currentEarnings,
        },
      ],
      summary: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        liabilities_and_equity: liabilitiesAndEquity,
        current_earnings: currentEarnings,
      },
      balance_check: {
        is_balanced: Math.abs(difference) < 0.01,
        difference,
      },
    },
  };
}

export async function getCashFlowReport(supabase: Supabase, period: ReportPeriod) {
  const cashAccountsResult = await supabase
    .from("accounts")
    .select("*")
    .eq("is_cash_account", true)
    .eq("is_active", true);

  if (cashAccountsResult.error) {
    return { error: cashAccountsResult.error.message };
  }

  const cashAccounts = cashAccountsResult.data ?? [];

  if (cashAccounts.length === 0) {
    return {
      data: {
        period,
        operating: emptyCashFlowSection("OPERATING"),
        financing: emptyCashFlowSection("FINANCING"),
        adjustments: emptyCashFlowSection("ADJUSTMENTS"),
        other: emptyCashFlowSection("OTHER"),
        summary: {
          net_cash_flow: 0,
          ending_cash_balance: 0,
        },
        lines: [],
      },
    };
  }

  const cashAccountIds = new Set(cashAccounts.map((account) => account.id));
  const ledgerResult = await getLedgerLines(supabase, {
    date_from: period.date_from,
    date_to: period.date_to,
    status: "POSTED",
    include_inactive: true,
  });

  if (ledgerResult.error) {
    return { error: ledgerResult.error };
  }

  if (!ledgerResult.data) {
    return { error: "Cash flow ledger lines were not returned." };
  }

  const cashLines = ledgerResult.data
    .filter((line) => cashAccountIds.has(line.account_id))
    .map((line) => ({
      ...line,
      cash_flow_category: categorizeCashFlow(line.source_module),
      cash_flow_amount: line.signed_amount,
    }));
  const operating = summarizeCashFlowSection("OPERATING", cashLines);
  const financing = summarizeCashFlowSection("FINANCING", cashLines);
  const adjustments = summarizeCashFlowSection("ADJUSTMENTS", cashLines);
  const other = summarizeCashFlowSection("OTHER", cashLines);
  const endingBalances = await getAccountBalances(supabase, {
    date_to: period.date_to ?? period.as_of,
    status: "POSTED",
    include_inactive: true,
  });

  if (endingBalances.error) {
    return { error: endingBalances.error };
  }

  const endingCashBalance = roundMoney(
    (endingBalances.data ?? [])
      .filter((balance) => cashAccountIds.has(balance.account_id))
      .reduce((sum, balance) => sum + balance.balance, 0),
  );
  const netCashFlow = roundMoney(operating.net_amount + financing.net_amount + adjustments.net_amount + other.net_amount);

  return {
    data: {
      period,
      operating,
      financing,
      adjustments,
      other,
      summary: {
        net_cash_flow: netCashFlow,
        ending_cash_balance: endingCashBalance,
      },
      lines: cashLines,
    },
  };
}

function filterNonZeroBalances(
  balances: AccountBalance[],
  accountType: AccountRow["account_type"],
) {
  return balances
    .filter((balance) => balance.account_type === accountType)
    .filter((balance) => balance.balance !== 0 || balance.total_debit !== 0 || balance.total_credit !== 0);
}

function sumBalance(balances: AccountBalance[]) {
  return roundMoney(balances.reduce((sum, balance) => sum + balance.balance, 0));
}

function calculateCurrentEarnings(balances: AccountBalance[]) {
  const revenue = sumBalance(balances.filter((balance) => balance.account_type === "REVENUE"));
  const cogs = sumBalance(balances.filter((balance) => balance.account_type === "COGS"));
  const expenses = sumBalance(balances.filter((balance) => balance.account_type === "EXPENSE"));

  return roundMoney(revenue - cogs - expenses);
}

function toBalanceSheetLine(balance: AccountBalance) {
  const amount =
    balance.account_type === "ASSET"
      ? signedBalanceSheetAmount(balance, "DEBIT")
      : signedBalanceSheetAmount(balance, "CREDIT");

  return {
    account_id: balance.account_id,
    account_code: balance.account_code,
    account_name: balance.account_name,
    amount,
  };
}

function signedBalanceSheetAmount(balance: AccountBalance, expectedNormalBalance: AccountRow["normal_balance"]) {
  return balance.normal_balance === expectedNormalBalance ? balance.balance : roundMoney(balance.balance * -1);
}

function categorizeCashFlow(sourceModule: JournalSourceModule) {
  if (operatingSourceModules.includes(sourceModule)) {
    return "OPERATING";
  }

  if (financingSourceModules.includes(sourceModule)) {
    return "FINANCING";
  }

  if (sourceModule === "CASH_ADJUSTMENT") {
    return "ADJUSTMENTS";
  }

  return "OTHER";
}

function summarizeCashFlowSection(
  section: "OPERATING" | "FINANCING" | "ADJUSTMENTS" | "OTHER",
  lines: Array<{ cash_flow_category: string; cash_flow_amount: number }>,
) {
  const sectionLines = lines.filter((line) => line.cash_flow_category === section);
  const cashIn = roundMoney(
    sectionLines.filter((line) => line.cash_flow_amount > 0).reduce((sum, line) => sum + line.cash_flow_amount, 0),
  );
  const cashOut = roundMoney(
    sectionLines.filter((line) => line.cash_flow_amount < 0).reduce((sum, line) => sum + Math.abs(line.cash_flow_amount), 0),
  );

  return {
    section,
    cash_in: cashIn,
    cash_out: cashOut,
    net_amount: roundMoney(cashIn - cashOut),
  };
}

function emptyCashFlowSection(section: "OPERATING" | "FINANCING" | "ADJUSTMENTS" | "OTHER") {
  return {
    section,
    cash_in: 0,
    cash_out: 0,
    net_amount: 0,
  };
}

function emptyUnitProfitabilitySummary() {
  return {
    units_sold: 0,
    gross_sales: 0,
    sales_cost: 0,
    net_sales: 0,
    total_unit_cost: 0,
    total_profit: 0,
  };
}

async function fetchPhoneUnitsById(supabase: Supabase, unitIds: string[]) {
  const unitsById = new Map<string, PhoneUnitRow>();

  if (unitIds.length === 0) {
    return { data: unitsById };
  }

  const unitsResult = await supabase
    .from("phone_units")
    .select("*")
    .in("id", unitIds);

  if (unitsResult.error) {
    return { error: unitsResult.error.message };
  }

  for (const unit of unitsResult.data ?? []) {
    unitsById.set(unit.id, unit);
  }

  return { data: unitsById };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
