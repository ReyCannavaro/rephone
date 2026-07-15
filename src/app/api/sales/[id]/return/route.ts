import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import {
  getDateString,
  getNumber,
  getOptionalString,
  readJsonObject,
  validateGoogleDriveUrl,
  type RouteContextWithId,
} from "@/lib/receipts/receipt-service";
import {
  generateSaleReturnNumber,
  saleReturnTargetStockStatuses,
  type SaleReturnTargetStockStatus,
} from "@/lib/sales/sale-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const returnDate = getDateString(body.return_date);
  const targetStockStatus = getReturnTargetStockStatus(body.target_stock_status);
  const refundProofUrl = getOptionalString(body.refund_proof_url);
  const refundProofError = validateGoogleDriveUrl(refundProofUrl, "refund_proof_url");

  if (refundProofError) {
    return apiError("INVALID_URL", refundProofError);
  }

  if (!returnDate || !targetStockStatus) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "return_date and target_stock_status are required. target_stock_status must be IN_STOCK, SERVICE, or DAMAGED.",
    );
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

  if (sale.status !== "COMPLETED") {
    return apiError("SALE_STATUS_BLOCKED", "Only COMPLETED sales can be returned.", 409, {
      status: sale.status,
    });
  }

  const existingReturn = await supabase
    .from("sale_returns")
    .select("id, return_number, status")
    .eq("sale_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingReturn.error) {
    return apiError("SALE_RETURN_LOOKUP_FAILED", existingReturn.error.message, 500);
  }

  if (existingReturn.data) {
    return apiError("SALE_ALREADY_RETURNED", "Sale already has an active return.", 409, existingReturn.data);
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
    return apiError("SALE_ITEM_REQUIRED", "Sale return requires at least one sale item.", 409);
  }

  const unitIds = [...new Set(saleItems.map((item) => item.phone_unit_id))];
  const unitsResult = await supabase
    .from("phone_units")
    .select("id, stock_status, sold_at")
    .in("id", unitIds)
    .is("deleted_at", null);

  if (unitsResult.error) {
    return apiError("SALE_UNITS_LOOKUP_FAILED", unitsResult.error.message, 500);
  }

  const units = unitsResult.data ?? [];

  if (units.length !== unitIds.length) {
    return apiError("SALE_UNIT_NOT_FOUND", "One or more sold units were not found.", 404);
  }

  const notSoldUnit = units.find((unit) => unit.stock_status !== "SOLD");

  if (notSoldUnit) {
    return apiError("UNIT_STATUS_BLOCKED", "Every returned unit must currently be SOLD.", 409, {
      unit_id: notSoldUnit.id,
      stock_status: notSoldUnit.stock_status,
    });
  }

  const saleJournalResult = sale.journal_entry_id
    ? await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", sale.journal_entry_id)
        .eq("source_module", "SALE")
        .is("deleted_at", null)
        .single()
    : await supabase
        .from("journal_entries")
        .select("*")
        .eq("source_module", "SALE")
        .eq("source_id", id)
        .is("deleted_at", null)
        .single();

  if (saleJournalResult.error) {
    return apiError("SALE_JOURNAL_NOT_FOUND", "Sale journal was not found.", 404, saleJournalResult.error.message);
  }

  const saleJournal = saleJournalResult.data;

  if (saleJournal.status === "REVERSED") {
    return apiError("SALE_JOURNAL_ALREADY_REVERSED", "Sale journal has already been reversed.", 409);
  }

  const saleJournalLinesResult = await supabase
    .from("journal_lines")
    .select("*")
    .eq("journal_entry_id", saleJournal.id)
    .is("deleted_at", null);

  if (saleJournalLinesResult.error) {
    return apiError("SALE_JOURNAL_LINES_LOOKUP_FAILED", saleJournalLinesResult.error.message, 500);
  }

  const saleJournalLines = saleJournalLinesResult.data ?? [];

  if (saleJournalLines.length < 2) {
    return apiError("SALE_JOURNAL_LINES_INCOMPLETE", "Sale journal must have at least two lines to reverse.", 409);
  }

  const refundAmount = getNumber(body.refund_amount, sale.subtotal_amount);
  const refundAccountId = getOptionalString(body.refund_account_id) ?? sale.payment_account_id;
  const refundReference = getOptionalString(body.refund_reference);

  if (refundAmount < 0) {
    return apiError("INVALID_REFUND_AMOUNT", "refund_amount cannot be negative.");
  }

  if (refundAmount > 0 && (!refundAccountId || !refundReference || !refundProofUrl)) {
    return apiError(
      "REFUND_PROOF_REQUIRED",
      "Returned sale with refund_amount > 0 requires refund_account_id, refund_reference, and refund_proof_url.",
      409,
    );
  }

  if (refundAccountId) {
    const refundAccount = await supabase
      .from("accounts")
      .select("id, is_cash_account, is_active")
      .eq("id", refundAccountId)
      .single();

    if (refundAccount.error) {
      return apiError("REFUND_ACCOUNT_NOT_FOUND", "Refund account was not found.", 404, refundAccount.error.message);
    }

    if (!refundAccount.data.is_active || !refundAccount.data.is_cash_account) {
      return apiError("INVALID_REFUND_ACCOUNT", "Refund account must be an active cash/bank account.", 409);
    }
  }

  const now = new Date().toISOString();
  const returnPayload = {
    return_number: getOptionalString(body.return_number) ?? generateSaleReturnNumber(),
    return_date: returnDate,
    return_reason_code: getOptionalString(body.return_reason_code),
    return_notes: getOptionalString(body.return_notes),
    refund_amount: refundAmount,
    refund_account_id: refundAccountId,
    refund_reference: refundReference,
    refund_proof_url: refundProofUrl,
    refund_proof_filename: getOptionalString(body.refund_proof_filename),
    refund_recorded_at: getOptionalString(body.refund_recorded_at) ?? (refundAmount > 0 ? now : null),
    completed_at: now,
    notes: getOptionalString(body.notes),
  };
  const reversalLines = saleJournalLines.map((line) => ({
    account_id: line.account_id,
    description: `Pembalik: ${line.description ?? saleJournal.description}`,
    debit: line.credit,
    credit: line.debit,
    phone_unit_id: line.phone_unit_id,
    seller_id: line.seller_id,
    customer_id: line.customer_id,
  }));
  const returnResult = await supabase.rpc("rpc_return_sale", {
    p_sale_id: id,
    p_sale_return: returnPayload,
    p_unit_ids: unitIds,
    p_target_stock_status: targetStockStatus,
    p_reversal_lines: reversalLines,
    p_reversed_journal_entry_id: saleJournal.id,
  });

  if (returnResult.error) {
    return apiError("SALE_RETURN_RPC_FAILED", returnResult.error.message, 500);
  }

  const returnData = returnResult.data as {
    sale: Database["public"]["Tables"]["sales"]["Row"];
    return: Database["public"]["Tables"]["sale_returns"]["Row"];
    journal_entry_id: string;
    target_stock_status: SaleReturnTargetStockStatus;
  };

  await writeAuditLog(supabase, {
    request,
    action: "REVERSAL",
    entity_table: "sale_returns",
    entity_id: returnData.return.id,
    reason: getOptionalString(body.audit_reason) ?? getOptionalString(body.reason),
    old_values: {
      sale,
      units,
      journal: saleJournal,
    },
    new_values: {
      sale: returnData.sale,
      return: returnData.return,
      target_stock_status: returnData.target_stock_status,
    },
    metadata: {
      sale_id: id,
      reversed_journal_entry_id: saleJournal.id,
      reversal_journal_entry_id: returnData.journal_entry_id,
      phone_unit_ids: unitIds,
    },
  });

  return apiOk({
    sale: returnData.sale,
    return: returnData.return,
    journal_entry_id: returnData.journal_entry_id,
    target_stock_status: returnData.target_stock_status,
  });
}

function getReturnTargetStockStatus(value: unknown) {
  const status = getOptionalString(value);

  if (!status) {
    return null;
  }

  return saleReturnTargetStockStatuses.includes(status as SaleReturnTargetStockStatus)
    ? (status as SaleReturnTargetStockStatus)
    : null;
}
