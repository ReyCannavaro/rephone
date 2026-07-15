import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import {
  ensureSufficientCashBalance,
  generateFinanceNumber,
  getActiveAccount,
  getActiveCashAccount,
} from "@/lib/finance/finance-service";
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

type OperatingExpenseInsert = Database["public"]["Tables"]["operating_expenses"]["Insert"];

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const expenseDate = getDateString(body.expense_date);
  const costCategoryId = getOptionalString(body.cost_category_id);
  const paymentAccountId = getOptionalString(body.payment_account_id);
  const description = getString(body.description);
  const amount = getNumber(body.amount);
  const proofUrl = getOptionalString(body.proof_url);
  const urlError = validateHttpsUrl(proofUrl, "proof_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  if (!expenseDate || !paymentAccountId || !description || amount <= 0) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "expense_date, payment_account_id, description, and amount > 0 are required.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const paymentAccount = await getActiveCashAccount(supabase, paymentAccountId);

  if (paymentAccount.error) {
    return apiError("INVALID_PAYMENT_ACCOUNT", paymentAccount.error, 409);
  }

  if (!paymentAccount.data) {
    return apiError("INVALID_PAYMENT_ACCOUNT", "Payment account is not configured.", 409);
  }

  const paymentAccountData = paymentAccount.data;
  const balance = await ensureSufficientCashBalance(supabase, paymentAccountData, amount);

  if (balance.error) {
    return apiError("INSUFFICIENT_BALANCE", balance.error, 409);
  }

  if (balance.data == null) {
    return apiError("BALANCE_LOOKUP_FAILED", "Unable to calculate account balance.", 500);
  }

  const expenseAccountIdFromBody = getOptionalString(body.expense_account_id);
  let expenseAccountId = expenseAccountIdFromBody;

  if (costCategoryId) {
    const categoryResult = await supabase
      .from("cost_categories")
      .select("id, scope, is_active, expense_account_id")
      .eq("id", costCategoryId)
      .single();

    if (categoryResult.error) {
      return apiError("COST_CATEGORY_NOT_FOUND", "Cost category was not found.", 404, categoryResult.error.message);
    }

    if (!categoryResult.data.is_active || categoryResult.data.scope !== "OPERATING") {
      return apiError("INVALID_COST_CATEGORY", "Cost category must be active and scoped to OPERATING.", 409);
    }

    expenseAccountId = categoryResult.data.expense_account_id ?? expenseAccountIdFromBody;
  }

  if (!expenseAccountId) {
    return apiError(
      "EXPENSE_ACCOUNT_REQUIRED",
      "expense_account_id is required when cost category does not define one.",
    );
  }

  const expenseAccount = await getActiveAccount(supabase, expenseAccountId);

  if (expenseAccount.error) {
    return apiError("EXPENSE_ACCOUNT_NOT_FOUND", expenseAccount.error, 404);
  }

  if (!expenseAccount.data) {
    return apiError("EXPENSE_ACCOUNT_NOT_FOUND", "Expense account is not configured.", 404);
  }

  const expenseAccountData = expenseAccount.data;

  if (expenseAccountData.account_type !== "EXPENSE") {
    return apiError("INVALID_EXPENSE_ACCOUNT", "Expense account must be an active EXPENSE account.", 409);
  }

  const payload: OperatingExpenseInsert = {
    expense_number: getOptionalString(body.expense_number) ?? generateFinanceNumber("OPEX"),
    expense_date: expenseDate,
    cost_category_id: costCategoryId,
    expense_account_id: expenseAccountId,
    payment_account_id: paymentAccountId,
    description,
    amount,
    reference: getOptionalString(body.reference),
    proof_url: proofUrl,
    proof_filename: getOptionalString(body.proof_filename),
    notes: getOptionalString(body.notes),
  };
  const expenseResult = await supabase.rpc("rpc_create_operating_expense", {
    p_expense: payload,
  });

  if (expenseResult.error) {
    return apiError("OPERATING_EXPENSE_RPC_FAILED", expenseResult.error.message, 500);
  }

  const expenseData = expenseResult.data as {
    expense: Database["public"]["Tables"]["operating_expenses"]["Row"];
    journal_entry_id: string;
  };

  await writeAuditLog(supabase, {
    request,
    action: "CREATE",
    entity_table: "operating_expenses",
    entity_id: expenseData.expense.id,
    reason: getOptionalString(body.audit_reason) ?? getOptionalString(body.notes),
    new_values: {
      expense: expenseData.expense,
      balance_before: balance.data,
    },
    metadata: {
      journal_entry_id: expenseData.journal_entry_id,
      payment_account_id: paymentAccountId,
      expense_account_id: expenseAccountId,
      amount,
    },
  });

  return apiOk(
    {
      expense: expenseData.expense,
      journal_entry_id: expenseData.journal_entry_id,
      balance_before: balance.data,
    },
    { status: 201 },
  );
}
