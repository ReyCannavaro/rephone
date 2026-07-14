import { apiError, apiOk } from "@/lib/api/responses";
import { createPostedJournal, getAccountIdByCode } from "@/lib/journals/journal-service";
import {
  getOptionalString,
  readJsonObject,
  validateHttpsUrl,
  type RouteContextWithId,
} from "@/lib/receipts/receipt-service";
import {
  calculateSaleTotals,
  getSalePaymentMethod,
  sellableStockStatuses,
} from "@/lib/sales/sale-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type SaleItemRow = Database["public"]["Tables"]["sale_items"]["Row"];
type SaleCostRow = Database["public"]["Tables"]["sale_costs"]["Row"];

type CostCategoryRow = Pick<
  Database["public"]["Tables"]["cost_categories"]["Row"],
  "id" | "name" | "scope" | "expense_account_id"
>;

export async function POST(request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const paymentAccountId = getOptionalString(body.payment_account_id);
  const paymentReference = getOptionalString(body.payment_reference);
  const paymentProofUrl = getOptionalString(body.payment_proof_url);
  const paymentMethod = getSalePaymentMethod(body.payment_method);
  const paymentUrlError = validateHttpsUrl(paymentProofUrl, "payment_proof_url");

  if (paymentUrlError) {
    return apiError("INVALID_URL", paymentUrlError);
  }

  if (getOptionalString(body.payment_method) && !paymentMethod) {
    return apiError("INVALID_PAYMENT_METHOD", "payment_method must be CASH, TRANSFER, MARKETPLACE, or OTHER.");
  }

  const supabase = createSupabaseAdminClient();
  const saleResult = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (saleResult.error) {
    return apiError("SALE_NOT_FOUND", "Sale was not found.", 404, saleResult.error.message);
  }

  const sale = saleResult.data;

  if (sale.status === "COMPLETED") {
    return apiOk(sale);
  }

  if (sale.status !== "DRAFT") {
    return apiError("SALE_STATUS_BLOCKED", `Sale with status ${sale.status} cannot be completed.`, 409);
  }

  const saleItemsResult = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", id)
    .is("deleted_at", null);

  if (saleItemsResult.error) {
    return apiError("SALE_ITEMS_LOOKUP_FAILED", saleItemsResult.error.message, 500);
  }

  const saleItems = saleItemsResult.data ?? [];

  if (saleItems.length === 0) {
    return apiError("SALE_ITEM_REQUIRED", "Sale cannot be completed without at least one item.", 409);
  }

  const saleCostsResult = await supabase
    .from("sale_costs")
    .select("*")
    .eq("sale_id", id)
    .is("deleted_at", null);

  if (saleCostsResult.error) {
    return apiError("SALE_COSTS_LOOKUP_FAILED", saleCostsResult.error.message, 500);
  }

  const saleCosts = saleCostsResult.data ?? [];
  const resolvedPaymentAccountId = paymentAccountId ?? sale.payment_account_id;
  const resolvedPaymentReference = paymentReference ?? sale.payment_reference;
  const resolvedPaymentProofUrl = paymentProofUrl ?? sale.payment_proof_url;

  if (!resolvedPaymentAccountId || !resolvedPaymentReference || !resolvedPaymentProofUrl) {
    return apiError(
      "SALE_PAYMENT_REQUIRED",
      "Completed sale requires payment_account_id, payment_reference, and payment_proof_url.",
      409,
    );
  }

  const paymentAccount = await supabase
    .from("accounts")
    .select("id, is_cash_account, is_active")
    .eq("id", resolvedPaymentAccountId)
    .single();

  if (paymentAccount.error) {
    return apiError("PAYMENT_ACCOUNT_NOT_FOUND", "Payment account was not found.", 404, paymentAccount.error.message);
  }

  if (!paymentAccount.data.is_active || !paymentAccount.data.is_cash_account) {
    return apiError("INVALID_PAYMENT_ACCOUNT", "Payment account must be an active cash/bank account.", 409);
  }

  const unitIds = [...new Set(saleItems.map((item) => item.phone_unit_id))];
  const unitsResult = await supabase
    .from("phone_units")
    .select("id, stock_code, stock_status")
    .in("id", unitIds)
    .is("deleted_at", null);

  if (unitsResult.error) {
    return apiError("SALE_UNITS_LOOKUP_FAILED", unitsResult.error.message, 500);
  }

  const units = unitsResult.data ?? [];

  if (units.length !== unitIds.length) {
    return apiError("SALE_UNIT_NOT_FOUND", "One or more sale units were not found.", 404);
  }

  const invalidUnit = units.find(
    (unit) => !sellableStockStatuses.includes(unit.stock_status as (typeof sellableStockStatuses)[number]),
  );

  if (invalidUnit) {
    return apiError(
      "UNIT_NOT_SELLABLE",
      "Only units with IN_STOCK or RESERVED status can be completed as sold.",
      409,
      { stock_code: invalidUnit.stock_code, stock_status: invalidUnit.stock_status },
    );
  }

  const fallbackExpenseAccount = await getAccountIdByCode(supabase, "6199");
  const revenueAccount = await getAccountIdByCode(supabase, "4101");
  const cogsAccount = await getAccountIdByCode(supabase, "5101");
  const inventoryAccount = await getAccountIdByCode(supabase, "1201");

  if (fallbackExpenseAccount.error) {
    return apiError("EXPENSE_ACCOUNT_NOT_FOUND", fallbackExpenseAccount.error, 500);
  }

  if (revenueAccount.error) {
    return apiError("REVENUE_ACCOUNT_NOT_FOUND", revenueAccount.error, 500);
  }

  if (cogsAccount.error) {
    return apiError("COGS_ACCOUNT_NOT_FOUND", cogsAccount.error, 500);
  }

  if (inventoryAccount.error) {
    return apiError("INVENTORY_ACCOUNT_NOT_FOUND", inventoryAccount.error, 500);
  }

  if (!fallbackExpenseAccount.data || !revenueAccount.data || !cogsAccount.data || !inventoryAccount.data) {
    return apiError("ACCOUNT_CONFIGURATION_INCOMPLETE", "Required sales journal accounts are not configured.", 500);
  }

  const costCategories = await fetchSaleCostCategories(supabase, saleCosts);

  if (costCategories.error) {
    return costCategories.error;
  }

  const totalFinalPrice = saleItems.reduce((sum, item) => sum + item.final_price, 0);
  const totalUnitCost = saleItems.reduce((sum, item) => sum + item.unit_cost, 0);
  const totalSalesCost = saleCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const totals = calculateSaleTotals({
    finalPrice: totalFinalPrice,
    totalUnitCost,
    totalSalesCost,
  });

  if (totals.total_net_amount < 0) {
    return apiError("INVALID_NET_AMOUNT", "Net sale amount cannot be negative after sales costs.", 409);
  }

  const now = new Date().toISOString();
  const completedSaleResult = await supabase
    .from("sales")
    .update({
      status: "COMPLETED",
      payment_account_id: resolvedPaymentAccountId,
      payment_method: paymentMethod ?? sale.payment_method,
      payment_reference: resolvedPaymentReference,
      payment_proof_url: resolvedPaymentProofUrl,
      payment_proof_filename: getOptionalString(body.payment_proof_filename) ?? sale.payment_proof_filename,
      payment_proof_recorded_at: getOptionalString(body.payment_proof_recorded_at) ?? now,
      completed_at: now,
      subtotal_amount: totals.subtotal_amount,
      total_sales_cost: totals.total_sales_cost,
      total_net_amount: totals.total_net_amount,
      total_cogs_amount: totals.total_cogs_amount,
      total_profit_amount: totals.total_profit_amount,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (completedSaleResult.error) {
    return apiError("SALE_COMPLETE_FAILED", completedSaleResult.error.message, 500);
  }

  const unitUpdate = await supabase
    .from("phone_units")
    .update({
      stock_status: "SOLD",
      sold_at: now,
      updated_at: now,
    })
    .in("id", unitIds)
    .in("stock_status", sellableStockStatuses)
    .select("id");

  if (unitUpdate.error) {
    await rollbackSaleToDraft(supabase, id, sale);

    return apiError("SALE_UNIT_STATUS_UPDATE_FAILED", unitUpdate.error.message, 500);
  }

  if ((unitUpdate.data ?? []).length !== unitIds.length) {
    await rollbackSaleToDraft(supabase, id, sale);
    await rollbackUnitsToPreviousStatus(supabase, units);

    return apiError("SALE_UNIT_STATUS_UPDATE_FAILED", "One or more units could not be marked as SOLD.", 409);
  }

  const existingJournal = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_module", "SALE")
    .eq("source_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingJournal.error) {
    return apiError("SALE_JOURNAL_LOOKUP_FAILED", existingJournal.error.message, 500);
  }

  if (existingJournal.data) {
    const linkedSale = await supabase
      .from("sales")
      .update({ journal_entry_id: existingJournal.data.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (linkedSale.error) {
      return apiError("SALE_JOURNAL_LINK_FAILED", linkedSale.error.message, 500);
    }

    return apiOk({ sale: linkedSale.data, journal_entry_id: existingJournal.data.id });
  }

  const journalLines = [
    {
      account_id: resolvedPaymentAccountId,
      description: `Penerimaan penjualan ${completedSaleResult.data.sale_number}`,
      debit: totals.subtotal_amount,
      credit: 0,
      customer_id: completedSaleResult.data.customer_id,
    },
    {
      account_id: revenueAccount.data,
      description: `Pendapatan penjualan ${completedSaleResult.data.sale_number}`,
      debit: 0,
      credit: totals.subtotal_amount,
      customer_id: completedSaleResult.data.customer_id,
    },
    ...saleItems.map((item) => ({
      account_id: cogsAccount.data,
      description: `HPP unit ${item.phone_unit_id}`,
      debit: item.unit_cost,
      credit: 0,
      phone_unit_id: item.phone_unit_id,
      customer_id: completedSaleResult.data.customer_id,
    })),
    ...saleItems.map((item) => ({
      account_id: inventoryAccount.data,
      description: `Persediaan keluar ${item.phone_unit_id}`,
      debit: 0,
      credit: item.unit_cost,
      phone_unit_id: item.phone_unit_id,
      customer_id: completedSaleResult.data.customer_id,
    })),
    ...saleCosts.map((cost) => {
      const category = costCategories.data.get(cost.cost_category_id);

      return {
        account_id: category?.expense_account_id ?? fallbackExpenseAccount.data,
        description: cost.description,
        debit: cost.amount,
        credit: 0,
        phone_unit_id: findCostPhoneUnitId(saleItems, cost),
        customer_id: completedSaleResult.data.customer_id,
      };
    }),
    ...saleCosts.map((cost) => ({
      account_id: cost.payment_account_id ?? resolvedPaymentAccountId,
      description: `Pembayaran biaya penjualan: ${cost.description}`,
      debit: 0,
      credit: cost.amount,
      phone_unit_id: findCostPhoneUnitId(saleItems, cost),
      customer_id: completedSaleResult.data.customer_id,
    })),
  ];

  const journal = await createPostedJournal(supabase, {
    transaction_date: completedSaleResult.data.sale_date,
    source_module: "SALE",
    source_id: id,
    description: `Penjualan unit ${completedSaleResult.data.sale_number}`,
    lines: journalLines,
  });

  if (journal.error || !journal.data) {
    await rollbackSaleToDraft(supabase, id, sale);
    await rollbackUnitsToPreviousStatus(supabase, units);

    return apiError("SALE_JOURNAL_CREATE_FAILED", journal.error ?? "Journal was not created.", 500);
  }

  const linkedSale = await supabase
    .from("sales")
    .update({ journal_entry_id: journal.data.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (linkedSale.error) {
    return apiError("SALE_JOURNAL_LINK_FAILED", linkedSale.error.message, 500);
  }

  return apiOk({
    sale: linkedSale.data,
    journal: journal.data,
    totals,
  });
}

async function fetchSaleCostCategories(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  saleCosts: SaleCostRow[],
) {
  const costCategoryIds = [...new Set(saleCosts.map((cost) => cost.cost_category_id))];
  const categories = new Map<string, CostCategoryRow>();

  if (costCategoryIds.length === 0) {
    return { data: categories };
  }

  const result = await supabase
    .from("cost_categories")
    .select("id, name, scope, expense_account_id")
    .in("id", costCategoryIds);

  if (result.error) {
    return { error: apiError("SALE_COST_CATEGORY_LOOKUP_FAILED", result.error.message, 500) };
  }

  for (const category of result.data ?? []) {
    if (category.scope !== "SALES") {
      return { error: apiError("INVALID_SALE_COST_CATEGORY", "Every sale cost must use a SALES cost category.", 409) };
    }

    categories.set(category.id, category);
  }

  const missingCategoryId = costCategoryIds.find((categoryId) => !categories.has(categoryId));

  if (missingCategoryId) {
    return { error: apiError("SALE_COST_CATEGORY_NOT_FOUND", "One or more sale cost categories were not found.", 404) };
  }

  return { data: categories };
}

function findCostPhoneUnitId(saleItems: SaleItemRow[], cost: SaleCostRow) {
  const matchedItem = saleItems.find((item) => item.id === cost.sale_item_id);

  return matchedItem?.phone_unit_id ?? saleItems[0]?.phone_unit_id ?? null;
}

async function rollbackSaleToDraft(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  saleId: string,
  previousSale: SaleRow,
) {
  await supabase
    .from("sales")
    .update({
      status: previousSale.status,
      payment_account_id: previousSale.payment_account_id,
      payment_method: previousSale.payment_method,
      payment_reference: previousSale.payment_reference,
      payment_proof_url: previousSale.payment_proof_url,
      payment_proof_filename: previousSale.payment_proof_filename,
      payment_proof_recorded_at: previousSale.payment_proof_recorded_at,
      completed_at: previousSale.completed_at,
      journal_entry_id: previousSale.journal_entry_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", saleId);
}

async function rollbackUnitsToPreviousStatus(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  units: Pick<Database["public"]["Tables"]["phone_units"]["Row"], "id" | "stock_status">[],
) {
  for (const unit of units) {
    await supabase
      .from("phone_units")
      .update({
        stock_status: unit.stock_status,
        sold_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", unit.id);
  }
}
