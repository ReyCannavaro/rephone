import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import {
  getNumber,
  getOptionalString,
  readJsonObject,
  type RouteContextWithId,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type PriceHistoryInsert = Database["public"]["Tables"]["unit_price_histories"]["Insert"];

const blockedPriceStatuses = ["SOLD", "REJECTED", "LOST", "WRITTEN_OFF"] as const;

export async function POST(request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const listingPrice = getNumber(body.listing_price);
  const minimumPrice = getNumber(body.minimum_price);

  if (listingPrice <= 0 || minimumPrice <= 0) {
    return apiError("INVALID_PRICE", "listing_price and minimum_price must be greater than zero.");
  }

  const supabase = createSupabaseAdminClient();
  const unitResult = await supabase
    .from("phone_units")
    .select("id, stock_code, stock_status, total_unit_cost, current_listing_price, minimum_price")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (unitResult.error) {
    return apiError("UNIT_NOT_FOUND", "Unit was not found.", 404, unitResult.error.message);
  }

  const unit = unitResult.data;

  if (blockedPriceStatuses.includes(unit.stock_status as (typeof blockedPriceStatuses)[number])) {
    return apiError(
      "UNIT_STATUS_BLOCKED",
      `Cannot set price for unit with status ${unit.stock_status}.`,
      409,
    );
  }

  const estimatedProfitAtListing = roundMoney(listingPrice - unit.total_unit_cost);
  const estimatedProfitAtMinimum = roundMoney(minimumPrice - unit.total_unit_cost);
  const warnings = buildPricingWarnings({
    listingPrice,
    minimumPrice,
    totalUnitCost: unit.total_unit_cost,
  });

  const historyPayload: PriceHistoryInsert = {
    phone_unit_id: id,
    listing_price: listingPrice,
    minimum_price: minimumPrice,
    estimated_profit_at_listing: estimatedProfitAtListing,
    estimated_profit_at_minimum: estimatedProfitAtMinimum,
    reason: getOptionalString(body.reason),
    effective_at: getOptionalString(body.effective_at) ?? new Date().toISOString(),
    notes: getOptionalString(body.notes),
  };

  const historyResult = await supabase
    .from("unit_price_histories")
    .insert(historyPayload)
    .select()
    .single();

  if (historyResult.error) {
    return apiError("PRICE_HISTORY_CREATE_FAILED", historyResult.error.message, 500);
  }

  const unitUpdate = await supabase
    .from("phone_units")
    .update({
      current_listing_price: listingPrice,
      minimum_price: minimumPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, stock_code, total_unit_cost, current_listing_price, minimum_price")
    .single();

  if (unitUpdate.error) {
    await supabase
      .from("unit_price_histories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", historyResult.data.id);

    return apiError("UNIT_PRICE_UPDATE_FAILED", unitUpdate.error.message, 500);
  }

  await writeAuditLog(supabase, {
    request,
    action: "UPDATE",
    entity_table: "phone_units",
    entity_id: id,
    reason: getOptionalString(body.audit_reason) ?? getOptionalString(body.reason),
    old_values: {
      id: unit.id,
      stock_code: unit.stock_code,
      total_unit_cost: unit.total_unit_cost,
      current_listing_price: unit.current_listing_price,
      minimum_price: unit.minimum_price,
    },
    new_values: {
      unit: unitUpdate.data,
      price_history: historyResult.data,
    },
    metadata: {
      unit_price_history_id: historyResult.data.id,
      estimated_profit_at_listing: estimatedProfitAtListing,
      estimated_profit_at_minimum: estimatedProfitAtMinimum,
    },
  });

  return apiOk(
    {
      unit: unitUpdate.data,
      price_history: historyResult.data,
      estimates: {
        total_unit_cost: unit.total_unit_cost,
        profit_at_listing_price: estimatedProfitAtListing,
        profit_at_minimum_price: estimatedProfitAtMinimum,
        margin_at_listing_price: calculateMargin(estimatedProfitAtListing, listingPrice),
        margin_at_minimum_price: calculateMargin(estimatedProfitAtMinimum, minimumPrice),
        markup_at_listing_price: calculateMarkup(estimatedProfitAtListing, unit.total_unit_cost),
        markup_at_minimum_price: calculateMarkup(estimatedProfitAtMinimum, unit.total_unit_cost),
      },
      warnings,
    },
    { status: 201 },
  );
}

function buildPricingWarnings(input: {
  listingPrice: number;
  minimumPrice: number;
  totalUnitCost: number;
}) {
  const warnings: string[] = [];

  if (input.minimumPrice > input.listingPrice) {
    warnings.push("Harga minimal lebih tinggi dari harga pasang.");
  }

  if (input.minimumPrice < input.totalUnitCost) {
    warnings.push("Harga minimal berada di bawah total modal.");
  }

  if (input.listingPrice < input.totalUnitCost) {
    warnings.push("Harga pasang berada di bawah total modal.");
  }

  return warnings;
}

function calculateMargin(profit: number, sellingPrice: number) {
  if (sellingPrice <= 0) {
    return 0;
  }

  return roundMoney((profit / sellingPrice) * 100);
}

function calculateMarkup(profit: number, totalUnitCost: number) {
  if (totalUnitCost <= 0) {
    return 0;
  }

  return roundMoney((profit / totalUnitCost) * 100);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
