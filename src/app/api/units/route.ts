import { apiError, apiOk } from "@/lib/api/responses";
import { getOptionalString } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type StockStatus = Database["public"]["Tables"]["phone_units"]["Row"]["stock_status"];

const stockStatusFilters: StockStatus[] = [
  "DRAFT",
  "INSPECTION",
  "REJECTED",
  "IN_STOCK",
  "RESERVED",
  "SOLD",
  "RETURNED",
  "SERVICE",
  "DAMAGED",
  "LOST",
  "WRITTEN_OFF",
];

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const statusParam = getOptionalString(searchParams.get("status"));
  const status = stockStatusFilters.includes(statusParam as StockStatus)
    ? (statusParam as StockStatus)
    : null;
  const q = getOptionalString(searchParams.get("q"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200);

  let query = supabase
    .from("phone_units")
    .select(
      "id, receipt_id, stock_code, stock_status, brand_id, model_id, storage_variant_id, color_id, physical_condition_id, imei_1, imei_2, serial_number, sim_type, battery_health, cycle_count, icloud_status, google_account_status, find_my_status, imei_status, mdm_status, purchase_price, purchase_transfer_fee, total_unit_cost, current_listing_price, minimum_price, minus_notes, internal_notes, photo_drive_url, acquired_at, sold_at, notes, created_at, updated_at",
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("stock_status", status);
  }

  if (q) {
    query = query.or(
      `stock_code.ilike.%${q}%,imei_1.ilike.%${q}%,imei_2.ilike.%${q}%,serial_number.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return apiError("UNITS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
