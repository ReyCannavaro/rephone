import { apiError, apiOk } from "@/lib/api/responses";
import {
  ensureReceiptCanMove,
  getInspectionStatus,
  getNumber,
  getOptionalString,
  getString,
  isRecord,
  readJsonObject,
  type RouteContextWithId,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type InspectionInsert = Database["public"]["Tables"]["unit_inspection_results"]["Insert"];

export async function POST(request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const rawResults = Array.isArray(parsed.data.results) ? parsed.data.results : null;

  if (!rawResults || rawResults.length === 0) {
    return apiError("INSPECTION_RESULTS_REQUIRED", "results must be a non-empty array.");
  }

  const supabase = createSupabaseAdminClient();
  const movable = await ensureReceiptCanMove(supabase, id, ["ACCEPTED", "REJECTED"]);

  if (movable.error) {
    return movable.error;
  }

  const defaultUnitId = movable.data.units.length === 1 ? movable.data.units[0]?.id : null;

  const rows = rawResults
    .filter(isRecord)
    .map((item): InspectionInsert | null => {
      const inspectionItemId = getString(item.inspection_item_id);
      const phoneUnitId = getOptionalString(item.phone_unit_id) ?? defaultUnitId;

      if (!inspectionItemId || !phoneUnitId) {
        return null;
      }

      return {
        receipt_id: id,
        phone_unit_id: phoneUnitId,
        inspection_item_id: inspectionItemId,
        result_status: getInspectionStatus(item.result_status),
        boolean_value: typeof item.boolean_value === "boolean" ? item.boolean_value : null,
        number_value: typeof item.number_value === "number" ? getNumber(item.number_value) : null,
        text_value: getOptionalString(item.text_value),
        notes: getOptionalString(item.notes),
      };
    })
    .filter((row): row is InspectionInsert => row !== null);

  if (rows.length !== rawResults.length) {
    return apiError(
      "INVALID_INSPECTION_RESULTS",
      "Each inspection result requires inspection_item_id and phone_unit_id, unless the receipt has exactly one unit.",
    );
  }

  const { data, error } = await supabase
    .from("unit_inspection_results")
    .upsert(rows, { onConflict: "phone_unit_id,inspection_item_id" })
    .select();

  if (error) {
    return apiError("INSPECTION_SAVE_FAILED", error.message, 500);
  }

  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("unit_receipts").update({ status: "INSPECTION", updated_at: now }).eq("id", id),
    supabase
      .from("phone_units")
      .update({ stock_status: "INSPECTION", updated_at: now })
      .eq("receipt_id", id)
      .eq("stock_status", "DRAFT"),
  ]);

  return apiOk(data);
}
