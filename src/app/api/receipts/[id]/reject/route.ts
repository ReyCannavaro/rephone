import { apiError, apiOk } from "@/lib/api/responses";
import {
  ensureReceiptCanMove,
  getOptionalString,
  readJsonObject,
  type RouteContextWithId,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const rejectionNotes = getOptionalString(parsed.data.rejection_notes);

  if (!rejectionNotes) {
    return apiError("REJECTION_NOTES_REQUIRED", "rejection_notes is required.");
  }

  const supabase = createSupabaseAdminClient();
  const movable = await ensureReceiptCanMove(supabase, id, ["ACCEPTED", "REJECTED"]);

  if (movable.error) {
    return movable.error;
  }

  const now = new Date().toISOString();
  const receiptUpdate = await supabase
    .from("unit_receipts")
    .update({
      status: "REJECTED",
      decision_at: now,
      rejection_reason_code: getOptionalString(parsed.data.rejection_reason_code),
      rejection_notes: rejectionNotes,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (receiptUpdate.error) {
    return apiError("RECEIPT_REJECT_FAILED", receiptUpdate.error.message, 500);
  }

  const unitUpdate = await supabase
    .from("phone_units")
    .update({ stock_status: "REJECTED", updated_at: now })
    .eq("receipt_id", id)
    .in("stock_status", ["DRAFT", "INSPECTION"]);

  if (unitUpdate.error) {
    return apiError("UNIT_REJECT_FAILED", unitUpdate.error.message, 500);
  }

  return apiOk(receiptUpdate.data);
}
