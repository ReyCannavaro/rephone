import { apiError } from "@/lib/api/responses";
import {
  getNumber,
  getOptionalString,
  getString,
  isRecord,
  validateGoogleDriveUrl,
} from "@/lib/receipts/receipt-service";

export const sellableStockStatuses = ["IN_STOCK", "RESERVED"] as const;
export const salePaymentMethods = ["CASH", "TRANSFER", "MARKETPLACE", "OTHER"] as const;
export const saleReturnTargetStockStatuses = ["IN_STOCK", "SERVICE", "DAMAGED"] as const;

export type SellableStockStatus = (typeof sellableStockStatuses)[number];
export type SalePaymentMethod = (typeof salePaymentMethods)[number];
export type SaleReturnTargetStockStatus = (typeof saleReturnTargetStockStatuses)[number];

export type SaleCostInput = {
  cost_category_id: string;
  description: string;
  amount: number;
  payment_account_id: string | null;
  notes: string | null;
};

export type SaleTotals = {
  subtotal_amount: number;
  total_sales_cost: number;
  total_net_amount: number;
  total_cogs_amount: number;
  total_profit_amount: number;
  margin_percent: number;
};

export function parseSaleCosts(value: unknown) {
  if (value == null) {
    return { data: [] as SaleCostInput[] };
  }

  if (!Array.isArray(value)) {
    return { error: apiError("INVALID_SALE_COSTS", "costs must be an array when provided.") };
  }

  const costs: SaleCostInput[] = [];

  for (const rawCost of value) {
    if (!isRecord(rawCost)) {
      return { error: apiError("INVALID_SALE_COST", "Every cost item must be an object.") };
    }

    const costCategoryId = getString(rawCost.cost_category_id);
    const description = getString(rawCost.description);
    const amount = getNumber(rawCost.amount);
    const paymentAccountId = getOptionalString(rawCost.payment_account_id);

    if (!costCategoryId || !description || amount <= 0) {
      return {
        error: apiError(
          "INVALID_SALE_COST",
          "Every cost item requires cost_category_id, description, and amount > 0.",
        ),
      };
    }

    costs.push({
      cost_category_id: costCategoryId,
      description,
      amount,
      payment_account_id: paymentAccountId,
      notes: getOptionalString(rawCost.notes),
    });
  }

  return { data: costs };
}

export function getSalePaymentMethod(value: unknown) {
  const method = getOptionalString(value);

  if (!method) {
    return null;
  }

  return salePaymentMethods.includes(method as SalePaymentMethod)
    ? (method as SalePaymentMethod)
    : null;
}

export function validatePaymentProofUrl(value: string | null) {
  return validateGoogleDriveUrl(value, "payment_proof_url");
}

export function calculateSaleTotals(input: {
  finalPrice: number;
  totalUnitCost: number;
  totalSalesCost: number;
}) {
  const subtotal = roundMoney(input.finalPrice);
  const totalSalesCost = roundMoney(input.totalSalesCost);
  const totalNet = roundMoney(subtotal - totalSalesCost);
  const totalCogs = roundMoney(input.totalUnitCost);
  const totalProfit = roundMoney(totalNet - totalCogs);

  return {
    subtotal_amount: subtotal,
    total_sales_cost: totalSalesCost,
    total_net_amount: totalNet,
    total_cogs_amount: totalCogs,
    total_profit_amount: totalProfit,
    margin_percent: calculateMargin(totalProfit, totalNet),
  } satisfies SaleTotals;
}

export function buildSaleWarnings(input: {
  finalPrice: number;
  minimumPrice: number | null;
  totalUnitCost: number;
  totalNetAmount: number;
}) {
  const warnings: string[] = [];

  if (input.minimumPrice != null && input.finalPrice < input.minimumPrice) {
    warnings.push("Harga jual final berada di bawah harga minimal.");
  }

  if (input.finalPrice < input.totalUnitCost) {
    warnings.push("Harga jual final berada di bawah total modal unit.");
  }

  if (input.totalNetAmount < input.totalUnitCost) {
    warnings.push("Net terjual setelah biaya penjualan berada di bawah total modal unit.");
  }

  return warnings;
}

export function generateSaleNumber(date = new Date()) {
  return `SAL-${formatCompactDate(date)}-${formatCompactTime(date)}`;
}

export function generateSaleReturnNumber(date = new Date()) {
  return `SRT-${formatCompactDate(date)}-${formatCompactTime(date)}`;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateMargin(profit: number, netAmount: number) {
  if (netAmount <= 0) {
    return 0;
  }

  return roundMoney((profit / netAmount) * 100);
}

function formatCompactDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function formatCompactTime(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
}
