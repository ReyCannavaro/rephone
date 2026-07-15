import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import {
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
  validateGoogleDriveUrl,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type CapitalContributionInsert = Database["public"]["Tables"]["capital_contributions"]["Insert"];

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const contributionDate = getDateString(body.contribution_date);
  const accountId = getOptionalString(body.account_id);
  const amount = getNumber(body.amount);
  const proofUrl = getOptionalString(body.proof_url);
  const urlError = validateGoogleDriveUrl(proofUrl, "proof_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  if (!contributionDate || !accountId || amount <= 0) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "contribution_date, account_id, and amount > 0 are required.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const cashAccount = await getActiveCashAccount(supabase, accountId);

  if (cashAccount.error) {
    return apiError("INVALID_CASH_ACCOUNT", cashAccount.error, 409);
  }

  const capitalAccount = await getActiveAccountByCode(supabase, "3101");

  if (capitalAccount.error) {
    return apiError("CAPITAL_ACCOUNT_NOT_FOUND", capitalAccount.error, 500);
  }

  if (!capitalAccount.data) {
    return apiError("CAPITAL_ACCOUNT_NOT_FOUND", "Capital account is not configured.", 500);
  }

  const capitalAccountData = capitalAccount.data;
  const payload: CapitalContributionInsert = {
    contribution_number: getOptionalString(body.contribution_number) ?? generateFinanceNumber("CAP"),
    contribution_date: contributionDate,
    account_id: accountId,
    amount,
    reference: getOptionalString(body.reference),
    proof_url: proofUrl,
    proof_filename: getOptionalString(body.proof_filename),
    notes: getOptionalString(body.notes),
  };
  const contributionResult = await supabase
    .from("capital_contributions")
    .insert(payload)
    .select()
    .single();

  if (contributionResult.error) {
    return apiError("CAPITAL_CONTRIBUTION_CREATE_FAILED", contributionResult.error.message, 500);
  }

  const journal = await createPostedJournal(supabase, {
    transaction_date: contributionDate,
    source_module: "CAPITAL",
    source_id: contributionResult.data.id,
    description: `Setoran modal ${contributionResult.data.contribution_number}`,
    lines: [
      {
        account_id: accountId,
        description: "Kas/bank diterima dari setoran modal",
        debit: amount,
        credit: 0,
      },
      {
        account_id: capitalAccountData.id,
        description: "Modal pemilik",
        debit: 0,
        credit: amount,
      },
    ],
  });

  if (journal.error || !journal.data) {
    await supabase
      .from("capital_contributions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", contributionResult.data.id);

    return apiError("CAPITAL_JOURNAL_CREATE_FAILED", journal.error ?? "Journal was not created.", 500);
  }

  const linkedContribution = await supabase
    .from("capital_contributions")
    .update({ journal_entry_id: journal.data.id, updated_at: new Date().toISOString() })
    .eq("id", contributionResult.data.id)
    .select()
    .single();

  if (linkedContribution.error) {
    return apiError("CAPITAL_JOURNAL_LINK_FAILED", linkedContribution.error.message, 500);
  }

  await writeAuditLog(supabase, {
    request,
    action: "CREATE",
    entity_table: "capital_contributions",
    entity_id: linkedContribution.data.id,
    reason: getOptionalString(body.audit_reason) ?? getOptionalString(body.notes),
    new_values: {
      contribution: linkedContribution.data,
      journal: journal.data,
    },
    metadata: {
      journal_entry_id: journal.data.id,
      account_id: accountId,
      amount,
    },
  });

  return apiOk({ contribution: linkedContribution.data, journal: journal.data }, { status: 201 });
}
