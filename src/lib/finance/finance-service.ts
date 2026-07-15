import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

export type FinanceResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

export async function getActiveAccount(
  supabase: Supabase,
  accountId: string,
): Promise<FinanceResult<AccountRow>> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (error) {
    return { error: error.message };
  }

  if (!data.is_active) {
    return { error: "Account must be active." };
  }

  return { data };
}

export async function getActiveCashAccount(
  supabase: Supabase,
  accountId: string,
): Promise<FinanceResult<AccountRow>> {
  const account = await getActiveAccount(supabase, accountId);

  if (account.error) {
    return account;
  }

  if (!account.data) {
    return { error: "Account was not found." };
  }

  if (!account.data.is_cash_account) {
    return { error: "Account must be an active cash/bank account." };
  }

  return account;
}

export async function getActiveAccountByCode(
  supabase: Supabase,
  accountCode: string,
): Promise<FinanceResult<AccountRow>> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("account_code", accountCode)
    .eq("is_active", true)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getPostedAccountBalance(
  supabase: Supabase,
  account: Pick<AccountRow, "id" | "normal_balance">,
): Promise<FinanceResult<number>> {
  const linesResult = await supabase
    .from("journal_lines")
    .select("journal_entry_id, debit, credit")
    .eq("account_id", account.id)
    .is("deleted_at", null);

  if (linesResult.error) {
    return { error: linesResult.error.message };
  }

  const lines = linesResult.data ?? [];
  const journalEntryIds = [...new Set(lines.map((line) => line.journal_entry_id))];

  if (journalEntryIds.length === 0) {
    return { data: 0 };
  }

  const entriesResult = await supabase
    .from("journal_entries")
    .select("id")
    .in("id", journalEntryIds)
    .eq("status", "POSTED")
    .is("deleted_at", null);

  if (entriesResult.error) {
    return { error: entriesResult.error.message };
  }

  const postedEntryIds = new Set((entriesResult.data ?? []).map((entry) => entry.id));
  const rawBalance = lines
    .filter((line) => postedEntryIds.has(line.journal_entry_id))
    .reduce((sum, line) => sum + line.debit - line.credit, 0);
  const balance = account.normal_balance === "DEBIT" ? rawBalance : rawBalance * -1;

  return { data: roundMoney(balance) };
}

export async function ensureSufficientCashBalance(
  supabase: Supabase,
  account: Pick<AccountRow, "id" | "normal_balance">,
  amount: number,
): Promise<FinanceResult<number>> {
  const balance = await getPostedAccountBalance(supabase, account);

  if (balance.error) {
    return balance;
  }

  if (balance.data == null) {
    return { error: "Unable to calculate account balance." };
  }

  const availableBalance = balance.data;

  if (availableBalance < amount) {
    return { error: `Insufficient account balance. Available balance is ${availableBalance}.` };
  }

  return { data: availableBalance };
}

export function generateFinanceNumber(prefix: string, date = new Date()) {
  return `${prefix}-${formatCompactDate(date)}-${formatCompactTime(date)}`;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCompactDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

function formatCompactTime(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
}
