import { apiError, apiOk } from "@/lib/api/responses";
import { createPostedJournal, getAccountIdByCode } from "@/lib/journals/journal-service";
import {
  ensureReceiptCanMove,
  getOptionalString,
  readJsonObject,
  validateHttpsUrl,
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
    validateHttpsUrl(paymentProofUrl, "purchase_payment_proof_url") ??
    validateHttpsUrl(photoDriveUrl, "photo_drive_url");

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
    .select("id")
    .eq("is_active", true)
    .eq("is_required", true);

  if (requiredInspectionIds.error) {
    return apiError("INSPECTION_REQUIREMENTS_FAILED", requiredInspectionIds.error.message, 500);
  }

  const requiredIds = new Set((requiredInspectionIds.data ?? []).map((item) => item.id));
  const inspectedIds = new Set(detail.inspections.map((inspection) => inspection.inspection_item_id));
  const missingInspectionCount = [...requiredIds].filter((itemId) => !inspectedIds.has(itemId)).length;

  if (missingInspectionCount > 0) {
    return apiError(
      "INSPECTION_INCOMPLETE",
      "Required inspection checklist must be completed before accepting a receipt.",
      409,
      { missing_count: missingInspectionCount },
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
      unit.purchase_price <= 0 ||
      !unit.imei_status ||
      (!unit.icloud_status && !unit.google_account_status),
  );

  if (invalidUnit) {
    return apiError(
      "UNIT_NOT_READY",
      "Every accepted unit requires IMEI 1, purchase price, IMEI status, and iCloud or Google account status.",
      409,
      { unit_id: invalidUnit.id, stock_code: invalidUnit.stock_code },
    );
  }

  const now = new Date().toISOString();
  const totalPurchaseAmount = detail.units.reduce((sum, unit) => sum + unit.purchase_price, 0);
  const totalDirectCost = detail.units.reduce((sum, unit) => sum + unit.purchase_transfer_fee, 0);
  const totalUnitCost = detail.units.reduce((sum, unit) => sum + unit.total_unit_cost, 0);

  const receiptUpdate = await supabase
    .from("unit_receipts")
    .update({
      status: "ACCEPTED",
      decision_at: now,
      purchase_account_id: receiptAccountId,
      purchase_payment_reference: receiptReference,
      purchase_payment_proof_url: receiptProofUrl,
      purchase_payment_proof_filename:
        getOptionalString(body.purchase_payment_proof_filename) ??
        detail.receipt.purchase_payment_proof_filename,
      purchase_payment_proof_recorded_at:
        getOptionalString(body.purchase_payment_proof_recorded_at) ?? now,
      photo_drive_url: receiptPhotoUrl,
      total_purchase_amount: totalPurchaseAmount,
      total_direct_cost: totalDirectCost,
      total_unit_cost: totalUnitCost,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (receiptUpdate.error) {
    return apiError("RECEIPT_ACCEPT_FAILED", receiptUpdate.error.message, 500);
  }

  const unitUpdate = await supabase
    .from("phone_units")
    .update({
      stock_status: "IN_STOCK",
      photo_drive_url: receiptPhotoUrl,
      acquired_at: receiptUpdate.data.receipt_date,
      updated_at: now,
    })
    .eq("receipt_id", id)
    .in("stock_status", ["DRAFT", "INSPECTION"]);

  if (unitUpdate.error) {
    return apiError("UNIT_ACCEPT_FAILED", unitUpdate.error.message, 500);
  }

  const existingJournal = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_module", "RECEIPT")
    .eq("source_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingJournal.error) {
    return apiError("JOURNAL_LOOKUP_FAILED", existingJournal.error.message, 500);
  }

  if (existingJournal.data) {
    return apiOk({ ...receiptUpdate.data, journal_entry_id: existingJournal.data.id });
  }

  const inventoryAccount = await getAccountIdByCode(supabase, "1201");

  if (inventoryAccount.error) {
    return apiError("INVENTORY_ACCOUNT_NOT_FOUND", inventoryAccount.error, 500);
  }

  if (!inventoryAccount.data) {
    return apiError("INVENTORY_ACCOUNT_NOT_FOUND", "Account 1201 is not configured.", 500);
  }

  const inventoryAccountId = inventoryAccount.data;

  const journal = await createPostedJournal(supabase, {
    transaction_date: receiptUpdate.data.receipt_date,
    source_module: "RECEIPT",
    source_id: id,
    description: `Penerimaan unit ${receiptUpdate.data.receipt_number}`,
    lines: [
      ...detail.units.map((unit) => ({
        account_id: inventoryAccountId,
        description: `Persediaan ${unit.stock_code}`,
        debit: unit.total_unit_cost,
        credit: 0,
        phone_unit_id: unit.id,
        seller_id: detail.receipt.seller_id,
      })),
      {
        account_id: receiptAccountId,
        description: `Pembayaran pembelian ${receiptUpdate.data.receipt_number}`,
        debit: 0,
        credit: totalUnitCost,
        seller_id: detail.receipt.seller_id,
      },
    ],
  });

  if (journal.error) {
    return apiError("JOURNAL_CREATE_FAILED", journal.error, 500);
  }

  if (!journal.data) {
    return apiError("JOURNAL_CREATE_FAILED", "Journal was not created.", 500);
  }

  const linkedReceipt = await supabase
    .from("unit_receipts")
    .update({ journal_entry_id: journal.data.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (linkedReceipt.error) {
    return apiError("JOURNAL_LINK_FAILED", linkedReceipt.error.message, 500);
  }

  return apiOk(linkedReceipt.data);
}
