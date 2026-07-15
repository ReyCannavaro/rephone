import { apiError, apiOk } from "@/lib/api/responses";
import {
  getDateString,
  getNumber,
  getOptionalString,
  getString,
  readJsonObject,
} from "@/lib/receipts/receipt-service";
import {
  buildSaleWarnings,
  calculateSaleTotals,
  generateSaleNumber,
  getSalePaymentMethod,
  parseSaleCosts,
  sellableStockStatuses,
  validatePaymentProofUrl,
} from "@/lib/sales/sale-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type SaleInsert = Database["public"]["Tables"]["sales"]["Insert"];
type SaleItemInsert = Database["public"]["Tables"]["sale_items"]["Insert"];
type SaleCostInsert = Database["public"]["Tables"]["sale_costs"]["Insert"];

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const saleDate = getDateString(body.sale_date);
  const customerId = getString(body.customer_id);
  const salesChannelId = getOptionalString(body.sales_channel_id);
  const phoneUnitId = getString(body.phone_unit_id);
  const finalPrice = getNumber(body.final_price);
  const paymentAccountId = getOptionalString(body.payment_account_id);
  const paymentMethod = getSalePaymentMethod(body.payment_method);
  const paymentProofUrl = getOptionalString(body.payment_proof_url);
  const paymentUrlError = validatePaymentProofUrl(paymentProofUrl);

  if (paymentUrlError) {
    return apiError("INVALID_URL", paymentUrlError);
  }

  if (getOptionalString(body.payment_method) && !paymentMethod) {
    return apiError("INVALID_PAYMENT_METHOD", "payment_method must be CASH, TRANSFER, MARKETPLACE, or OTHER.");
  }

  if (!saleDate || !customerId || !phoneUnitId || finalPrice <= 0) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "sale_date, customer_id, phone_unit_id, and final_price > 0 are required.",
    );
  }

  const parsedCosts = parseSaleCosts(body.costs);

  if (parsedCosts.error) {
    return parsedCosts.error;
  }

  const costs = parsedCosts.data;
  const supabase = createSupabaseAdminClient();
  const customerResult = await supabase
    .from("customers")
    .select("id, is_active, is_blocked")
    .eq("id", customerId)
    .single();

  if (customerResult.error) {
    return apiError("CUSTOMER_NOT_FOUND", "Customer was not found.", 404, customerResult.error.message);
  }

  if (!customerResult.data.is_active || customerResult.data.is_blocked) {
    return apiError("CUSTOMER_BLOCKED", "Customer must be active and not blocked.", 409);
  }

  if (salesChannelId) {
    const channelResult = await supabase
      .from("sales_channels")
      .select("id, is_active")
      .eq("id", salesChannelId)
      .single();

    if (channelResult.error) {
      return apiError("SALES_CHANNEL_NOT_FOUND", "Sales channel was not found.", 404, channelResult.error.message);
    }

    if (!channelResult.data.is_active) {
      return apiError("SALES_CHANNEL_INACTIVE", "Sales channel must be active.", 409);
    }
  }

  if (paymentAccountId) {
    const paymentAccountResult = await supabase
      .from("accounts")
      .select("id, is_cash_account, is_active")
      .eq("id", paymentAccountId)
      .single();

    if (paymentAccountResult.error) {
      return apiError("PAYMENT_ACCOUNT_NOT_FOUND", "Payment account was not found.", 404, paymentAccountResult.error.message);
    }

    if (!paymentAccountResult.data.is_active || !paymentAccountResult.data.is_cash_account) {
      return apiError("INVALID_PAYMENT_ACCOUNT", "Payment account must be an active cash/bank account.", 409);
    }
  }

  const unitResult = await supabase
    .from("phone_units")
    .select("id, stock_code, stock_status, total_unit_cost, current_listing_price, minimum_price")
    .eq("id", phoneUnitId)
    .is("deleted_at", null)
    .single();

  if (unitResult.error) {
    return apiError("UNIT_NOT_FOUND", "Unit was not found.", 404, unitResult.error.message);
  }

  const unit = unitResult.data;

  if (!sellableStockStatuses.includes(unit.stock_status as (typeof sellableStockStatuses)[number])) {
    return apiError(
      "UNIT_NOT_SELLABLE",
      "Only units with IN_STOCK or RESERVED status can be sold.",
      409,
      { stock_status: unit.stock_status },
    );
  }

  const activeSaleItemsResult = await supabase
    .from("sale_items")
    .select("sale_id")
    .eq("phone_unit_id", phoneUnitId)
    .is("deleted_at", null);

  if (activeSaleItemsResult.error) {
    return apiError("ACTIVE_SALE_LOOKUP_FAILED", activeSaleItemsResult.error.message, 500);
  }

  const activeSaleIds = [...new Set((activeSaleItemsResult.data ?? []).map((item) => item.sale_id))];

  if (activeSaleIds.length > 0) {
    const activeSalesResult = await supabase
      .from("sales")
      .select("id, sale_number, status")
      .in("id", activeSaleIds)
      .in("status", ["DRAFT", "COMPLETED"])
      .is("deleted_at", null);

    if (activeSalesResult.error) {
      return apiError("ACTIVE_SALE_LOOKUP_FAILED", activeSalesResult.error.message, 500);
    }

    if ((activeSalesResult.data ?? []).length > 0) {
      return apiError(
        "UNIT_ALREADY_IN_ACTIVE_SALE",
        "Unit already belongs to an active draft or completed sale.",
        409,
        activeSalesResult.data[0],
      );
    }
  }

  const costCategoryIds = [...new Set(costs.map((cost) => cost.cost_category_id))];

  if (costCategoryIds.length > 0) {
    const categoriesResult = await supabase
      .from("cost_categories")
      .select("id, scope, is_active")
      .in("id", costCategoryIds);

    if (categoriesResult.error) {
      return apiError("SALE_COST_CATEGORY_LOOKUP_FAILED", categoriesResult.error.message, 500);
    }

    const validCategoryIds = new Set(
      (categoriesResult.data ?? [])
        .filter((category) => category.is_active && category.scope === "SALES")
        .map((category) => category.id),
    );
    const invalidCost = costs.find((cost) => !validCategoryIds.has(cost.cost_category_id));

    if (invalidCost) {
      return apiError("INVALID_SALE_COST_CATEGORY", "Every sale cost must use an active SALES cost category.", 409);
    }
  }

  const costPaymentAccountIds = [
    ...new Set(costs.map((cost) => cost.payment_account_id).filter((id): id is string => Boolean(id))),
  ];

  if (costPaymentAccountIds.length > 0) {
    const accountsResult = await supabase
      .from("accounts")
      .select("id, is_cash_account, is_active")
      .in("id", costPaymentAccountIds);

    if (accountsResult.error) {
      return apiError("SALE_COST_PAYMENT_ACCOUNT_LOOKUP_FAILED", accountsResult.error.message, 500);
    }

    const validAccountIds = new Set(
      (accountsResult.data ?? [])
        .filter((account) => account.is_active && account.is_cash_account)
        .map((account) => account.id),
    );
    const invalidAccount = costPaymentAccountIds.find((id) => !validAccountIds.has(id));

    if (invalidAccount) {
      return apiError("INVALID_SALE_COST_PAYMENT_ACCOUNT", "Sale cost payment accounts must be active cash/bank accounts.", 409);
    }
  }

  const totalSalesCost = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const totals = calculateSaleTotals({
    finalPrice,
    totalUnitCost: unit.total_unit_cost,
    totalSalesCost,
  });
  const warnings = buildSaleWarnings({
    finalPrice,
    minimumPrice: unit.minimum_price,
    totalUnitCost: unit.total_unit_cost,
    totalNetAmount: totals.total_net_amount,
  });

  if (totals.total_net_amount < 0) {
    return apiError("INVALID_NET_AMOUNT", "Net sale amount cannot be negative after sales costs.");
  }

  const salePayload: SaleInsert = {
    sale_number: getOptionalString(body.sale_number) ?? generateSaleNumber(),
    sale_date: saleDate,
    customer_id: customerId,
    sales_channel_id: salesChannelId,
    status: "DRAFT",
    payment_account_id: paymentAccountId,
    payment_method: paymentMethod,
    payment_reference: getOptionalString(body.payment_reference),
    payment_proof_url: paymentProofUrl,
    payment_proof_filename: getOptionalString(body.payment_proof_filename),
    subtotal_amount: totals.subtotal_amount,
    total_sales_cost: totals.total_sales_cost,
    total_net_amount: totals.total_net_amount,
    total_cogs_amount: totals.total_cogs_amount,
    total_profit_amount: totals.total_profit_amount,
    notes: getOptionalString(body.notes),
  };

  const saleResult = await supabase.from("sales").insert(salePayload).select().single();

  if (saleResult.error) {
    return apiError("SALE_CREATE_FAILED", saleResult.error.message, 500);
  }

  const saleItemPayload: SaleItemInsert = {
    sale_id: saleResult.data.id,
    phone_unit_id: phoneUnitId,
    listing_price: unit.current_listing_price,
    minimum_price: unit.minimum_price,
    final_price: finalPrice,
    unit_cost: unit.total_unit_cost,
    sales_cost_amount: totals.total_sales_cost,
    net_amount: totals.total_net_amount,
    profit_amount: totals.total_profit_amount,
    notes: getOptionalString(body.item_notes),
  };

  const saleItemResult = await supabase.from("sale_items").insert(saleItemPayload).select().single();

  if (saleItemResult.error) {
    await supabase.from("sales").update({ deleted_at: new Date().toISOString() }).eq("id", saleResult.data.id);

    return apiError("SALE_ITEM_CREATE_FAILED", saleItemResult.error.message, 500);
  }

  const saleCostPayloads: SaleCostInsert[] = costs.map((cost) => ({
    sale_id: saleResult.data.id,
    sale_item_id: saleItemResult.data.id,
    cost_category_id: cost.cost_category_id,
    description: cost.description,
    amount: cost.amount,
    payment_account_id: cost.payment_account_id,
    notes: cost.notes,
  }));

  let saleCosts: Database["public"]["Tables"]["sale_costs"]["Row"][] = [];

  if (saleCostPayloads.length > 0) {
    const saleCostsResult = await supabase.from("sale_costs").insert(saleCostPayloads).select();

    if (saleCostsResult.error) {
      await supabase.from("sales").update({ deleted_at: new Date().toISOString() }).eq("id", saleResult.data.id);

      return apiError("SALE_COST_CREATE_FAILED", saleCostsResult.error.message, 500);
    }

    saleCosts = saleCostsResult.data ?? [];
  }

  return apiOk(
    {
      sale: saleResult.data,
      item: saleItemResult.data,
      costs: saleCosts,
      estimates: {
        ...totals,
        unit_stock_code: unit.stock_code,
      },
      warnings,
    },
    { status: 201 },
  );
}
