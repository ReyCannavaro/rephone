import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import {
  ensureSufficientCashBalance,
  generateFinanceNumber,
  getActiveAccount,
  getActiveAccountByCode,
  getActiveCashAccount,
} from "@/lib/finance/finance-service";
import { createPostedJournal } from "@/lib/journals/journal-service";
import {
  getDateString,
  getNumber,
  getOptionalString,
  getString,
  readJsonObject,
  validateHttpsUrl,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type CashAdjustmentInsert = Database["public"]["Tables"]["cash_adjustments"]["Insert"];
type AdjustmentType = CashAdjustmentInsert["adjustment_type"];

const adjustmentTypes = ["INCREASE", "DECREASE"] as const;

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const adjustmentDate = getDateString(body.adjustment_date);
  const accountId = getOptionalString(body.account_id);
  const adjustmentType = getAdjustmentType(body.adjustment_type);
  const amount = getNumber(body.amount);
  const reason = getString(body.reason);
  const proofUrl = getOptionalString(body.proof_url);
  const urlError = validateHttpsUrl(proofUrl, "proof_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  if (!adjustmentDate || !accountId || !adjustmentType || amount <= 0 || !reason) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "adjustment_date, account_id, adjustment_type, amount > 0, and reason are required.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const cashAccount = await getActiveCashAccount(supabase, accountId);

  if (cashAccount.error) {
    return apiError("INVALID_CASH_ACCOUNT", cashAccount.error, 409);
  }

  if (!cashAccount.data) {
    return apiError("INVALID_CASH_ACCOUNT", "Cash/bank account is not configured.", 409);
  }

  const cashAccountData = cashAccount.data;
  let balanceBefore: number | null = null;

  if (adjustmentType === "DECREASE") {
    const balance = await ensureSufficientCashBalance(supabase, cashAccountData, amount);

    if (balance.error) {
      return apiError("INSUFFICIENT_BALANCE", balance.error, 409);
    }

    if (balance.data == null) {
      return apiError("BALANCE_LOOKUP_FAILED", "Unable to calculate account balance.", 500);
    }

    balanceBefore = balance.data;
  }

  const defaultOffsetAccountCode = adjustmentType === "INCREASE" ? "4102" : "6199";
  const offsetAccountIdFromBody = getOptionalString(body.offset_account_id);
  const offsetAccount = offsetAccountIdFromBody
    ? await getActiveAccount(supabase, offsetAccountIdFromBody)
    : await getActiveAccountByCode(supabase, defaultOffsetAccountCode);

  if (offsetAccount.error) {
    return apiError("OFFSET_ACCOUNT_NOT_FOUND", offsetAccount.error, 404);
  }

  if (!offsetAccount.data) {
    return apiError("OFFSET_ACCOUNT_NOT_FOUND", "Offset account is not configured.", 404);
  }

  const offsetAccountData = offsetAccount.data;

  if (offsetAccountData.id === accountId) {
    return apiError("INVALID_OFFSET_ACCOUNT", "Offset account cannot be the same as adjusted cash/bank account.", 409);
  }

  const payload: CashAdjustmentInsert = {
    adjustment_number: getOptionalString(body.adjustment_number) ?? generateFinanceNumber("CADJ"),
    adjustment_date: adjustmentDate,
    account_id: accountId,
    adjustment_type: adjustmentType,
    amount,
    reason,
    offset_account_id: offsetAccountData.id,
    reference: getOptionalString(body.reference),
    proof_url: proofUrl,
    proof_filename: getOptionalString(body.proof_filename),
    notes: getOptionalString(body.notes),
  };
  const adjustmentResult = await supabase.from("cash_adjustments").insert(payload).select().single();

  if (adjustmentResult.error) {
    return apiError("CASH_ADJUSTMENT_CREATE_FAILED", adjustmentResult.error.message, 500);
  }

  const lines =
    adjustmentType === "INCREASE"
      ? [
          {
            account_id: accountId,
            description: `Penyesuaian kas masuk: ${reason}`,
            debit: amount,
            credit: 0,
          },
          {
            account_id: offsetAccountData.id,
            description: reason,
            debit: 0,
            credit: amount,
          },
        ]
      : [
          {
            account_id: offsetAccountData.id,
            description: reason,
            debit: amount,
            credit: 0,
          },
          {
            account_id: accountId,
            description: `Penyesuaian kas keluar: ${reason}`,
            debit: 0,
            credit: amount,
          },
        ];

  const journal = await createPostedJournal(supabase, {
    transaction_date: adjustmentDate,
    source_module: "CASH_ADJUSTMENT",
    source_id: adjustmentResult.data.id,
    description: `Penyesuaian kas ${adjustmentResult.data.adjustment_number}`,
    lines,
  });

  if (journal.error || !journal.data) {
    await supabase
      .from("cash_adjustments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", adjustmentResult.data.id);

    return apiError("CASH_ADJUSTMENT_JOURNAL_CREATE_FAILED", journal.error ?? "Journal was not created.", 500);
  }

  const linkedAdjustment = await supabase
    .from("cash_adjustments")
    .update({ journal_entry_id: journal.data.id, updated_at: new Date().toISOString() })
    .eq("id", adjustmentResult.data.id)
    .select()
    .single();

  if (linkedAdjustment.error) {
    return apiError("CASH_ADJUSTMENT_JOURNAL_LINK_FAILED", linkedAdjustment.error.message, 500);
  }

  await writeAuditLog(supabase, {
    request,
    action: "CREATE",
    entity_table: "cash_adjustments",
    entity_id: linkedAdjustment.data.id,
    reason: getOptionalString(body.audit_reason) ?? reason,
    new_values: {
      adjustment: linkedAdjustment.data,
      journal: journal.data,
      balance_before: balanceBefore,
    },
    metadata: {
      journal_entry_id: journal.data.id,
      account_id: accountId,
      adjustment_type: adjustmentType,
      amount,
    },
  });

  return apiOk(
    {
      adjustment: linkedAdjustment.data,
      journal: journal.data,
      balance_before: balanceBefore,
    },
    { status: 201 },
  );
}

function getAdjustmentType(value: unknown) {
  const text = getOptionalString(value);

  if (!text) {
    return null;
  }

  return adjustmentTypes.includes(text as AdjustmentType) ? (text as AdjustmentType) : null;
}
