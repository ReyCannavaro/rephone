import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import {
  ensureReceiptCanMove,
  getOptionalString,
  isActiveImeiStatus,
  readJsonObject,
  validateGoogleDriveUrl,
  validateImei,
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

  const body = parsed.data;
  const purchaseAccountId = getOptionalString(body.purchase_account_id);
  const paymentReference = getOptionalString(body.purchase_payment_reference);
  const paymentProofUrl = getOptionalString(body.purchase_payment_proof_url);
  const photoDriveUrl = getOptionalString(body.photo_drive_url);
  const urlError =
    validateGoogleDriveUrl(paymentProofUrl, "purchase_payment_proof_url") ??
    validateGoogleDriveUrl(photoDriveUrl, "photo_drive_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  const supabase = createSupabaseAdminClient();
  const movable = await ensureReceiptCanMove(supabase, id, ["ACCEPTED", "REJECTED"]);

  if (movable.error) {
    return movable.error;
  }

  const detail = movable.data;

  if (detail.units.length === 0) {
    return apiError("UNIT_REQUIRED", "Receipt cannot be accepted without at least one unit.");
  }

  const requiredInspectionIds = await supabase
    .from("inspection_items")
    .select("id, applies_to_brand_id")
    .eq("is_active", true)
    .eq("is_required", true);

  if (requiredInspectionIds.error) {
    return apiError("INSPECTION_REQUIREMENTS_FAILED", requiredInspectionIds.error.message, 500);
  }

  const missingInspections = detail.units.flatMap((unit) => {
    const inspectedIds = new Set(
      detail.inspections
        .filter((inspection) => inspection.phone_unit_id === unit.id)
        .map((inspection) => inspection.inspection_item_id),
    );

    return (requiredInspectionIds.data ?? [])
      .filter((item) => !item.applies_to_brand_id || item.applies_to_brand_id === unit.brand_id)
      .filter((item) => !inspectedIds.has(item.id))
      .map((item) => ({
        phone_unit_id: unit.id,
        stock_code: unit.stock_code,
        inspection_item_id: item.id,
      }));
  });

  if (missingInspections.length > 0) {
    return apiError(
      "INSPECTION_INCOMPLETE",
      "Required inspection checklist must be completed for each unit brand before accepting a receipt.",
      409,
      { missing_count: missingInspections.length, missing_items: missingInspections },
    );
  }

  const receiptPhotoUrl = photoDriveUrl ?? detail.receipt.photo_drive_url;
  const receiptProofUrl = paymentProofUrl ?? detail.receipt.purchase_payment_proof_url;
  const receiptAccountId = purchaseAccountId ?? detail.receipt.purchase_account_id;
  const receiptReference = paymentReference ?? detail.receipt.purchase_payment_reference;

  if (!receiptPhotoUrl || !receiptProofUrl || !receiptAccountId || !receiptReference) {
    return apiError(
      "PAYMENT_AND_PHOTO_REQUIRED",
      "Accepted receipt requires purchase account, payment reference, payment proof URL, and unit photo Drive URL.",
      409,
    );
  }

  const invalidUnit = detail.units.find(
    (unit) =>
      !unit.imei_1 ||
      validateImei(unit.imei_1, "imei_1") ||
      validateImei(unit.imei_2, "imei_2") ||
      unit.purchase_price <= 0 ||
      !isActiveImeiStatus(unit.imei_status) ||
      (!unit.icloud_status && !unit.google_account_status),
  );

  if (invalidUnit) {
    return apiError(
      "UNIT_NOT_READY",
      "Every accepted unit requires valid IMEI, active IMEI status, purchase price, and iCloud or Google account status.",
      409,
      { unit_id: invalidUnit.id, stock_code: invalidUnit.stock_code },
    );
  }

  const totalUnitCost = detail.units.reduce((sum, unit) => sum + unit.total_unit_cost, 0);

  const acceptedReceipt = await supabase.rpc("rpc_accept_receipt", {
    p_receipt_id: id,
    p_purchase_account_id: receiptAccountId,
    p_purchase_payment_reference: receiptReference,
    p_purchase_payment_proof_url: receiptProofUrl,
    p_purchase_payment_proof_filename:
      getOptionalString(body.purchase_payment_proof_filename) ?? detail.receipt.purchase_payment_proof_filename,
    p_purchase_payment_proof_recorded_at: getOptionalString(body.purchase_payment_proof_recorded_at),
    p_photo_drive_url: receiptPhotoUrl,
  });

  if (acceptedReceipt.error) {
    return apiError("RECEIPT_ACCEPT_RPC_FAILED", acceptedReceipt.error.message, 500);
  }

  const acceptedData = acceptedReceipt.data as { receipt: unknown; journal_entry_id: string };

  await writeAuditLog(supabase, {
    request,
    action: "ACCEPT",
    entity_table: "unit_receipts",
    entity_id: id,
    reason: getOptionalString(body.audit_reason) ?? getOptionalString(body.notes),
    old_values: detail.receipt,
    new_values: acceptedData.receipt,
    metadata: {
      phone_unit_ids: detail.units.map((unit) => unit.id),
      journal_entry_id: acceptedData.journal_entry_id,
      total_unit_cost: totalUnitCost,
    },
  });

  return apiOk(acceptedData.receipt);
}
