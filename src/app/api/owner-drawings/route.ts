import { apiError, apiOk } from "@/lib/api/responses";
import {
  ensureSufficientCashBalance,
  generateFinanceNumber,
  getActiveAccountByCode,
  getActiveCashAccount,
} from "@/lib/finance/finance-service";
import { createPostedJournal } from "@/lib/journals/journal-service";
import {
  getDateString,
  getNumber,
  getOptionalString,
  readJsonObject,
  validateHttpsUrl,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type OwnerDrawingInsert = Database["public"]["Tables"]["owner_drawings"]["Insert"];

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const drawingDate = getDateString(body.drawing_date);
  const accountId = getOptionalString(body.account_id);
  const amount = getNumber(body.amount);
  const proofUrl = getOptionalString(body.proof_url);
  const urlError = validateHttpsUrl(proofUrl, "proof_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  if (!drawingDate || !accountId || amount <= 0) {
    return apiError("MISSING_REQUIRED_FIELDS", "drawing_date, account_id, and amount > 0 are required.");
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
  const balance = await ensureSufficientCashBalance(supabase, cashAccountData, amount);

  if (balance.error) {
    return apiError("INSUFFICIENT_BALANCE", balance.error, 409);
  }

  if (balance.data == null) {
    return apiError("BALANCE_LOOKUP_FAILED", "Unable to calculate account balance.", 500);
  }

  const drawingAccount = await getActiveAccountByCode(supabase, "3102");

  if (drawingAccount.error) {
    return apiError("DRAWING_ACCOUNT_NOT_FOUND", drawingAccount.error, 500);
  }

  if (!drawingAccount.data) {
    return apiError("DRAWING_ACCOUNT_NOT_FOUND", "Owner drawing account is not configured.", 500);
  }

  const drawingAccountData = drawingAccount.data;
  const payload: OwnerDrawingInsert = {
    drawing_number: getOptionalString(body.drawing_number) ?? generateFinanceNumber("DRW"),
    drawing_date: drawingDate,
    account_id: accountId,
    amount,
    reference: getOptionalString(body.reference),
    proof_url: proofUrl,
    proof_filename: getOptionalString(body.proof_filename),
    notes: getOptionalString(body.notes),
  };
  const drawingResult = await supabase.from("owner_drawings").insert(payload).select().single();

  if (drawingResult.error) {
    return apiError("OWNER_DRAWING_CREATE_FAILED", drawingResult.error.message, 500);
  }

  const journal = await createPostedJournal(supabase, {
    transaction_date: drawingDate,
    source_module: "OWNER_DRAWING",
    source_id: drawingResult.data.id,
    description: `Prive pemilik ${drawingResult.data.drawing_number}`,
    lines: [
      {
        account_id: drawingAccountData.id,
        description: "Prive pemilik",
        debit: amount,
        credit: 0,
      },
      {
        account_id: accountId,
        description: "Kas/bank keluar untuk prive",
        debit: 0,
        credit: amount,
      },
    ],
  });

  if (journal.error || !journal.data) {
    await supabase
      .from("owner_drawings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", drawingResult.data.id);

    return apiError("OWNER_DRAWING_JOURNAL_CREATE_FAILED", journal.error ?? "Journal was not created.", 500);
  }

  const linkedDrawing = await supabase
    .from("owner_drawings")
    .update({ journal_entry_id: journal.data.id, updated_at: new Date().toISOString() })
    .eq("id", drawingResult.data.id)
    .select()
    .single();

  if (linkedDrawing.error) {
    return apiError("OWNER_DRAWING_JOURNAL_LINK_FAILED", linkedDrawing.error.message, 500);
  }

  return apiOk(
    {
      drawing: linkedDrawing.data,
      journal: journal.data,
      balance_before: balance.data,
    },
    { status: 201 },
  );
}
