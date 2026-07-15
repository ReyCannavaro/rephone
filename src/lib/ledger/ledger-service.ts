import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type JournalEntryRow = Database["public"]["Tables"]["journal_entries"]["Row"];
type JournalLineRow = Database["public"]["Tables"]["journal_lines"]["Row"];

export type LedgerFilters = {
  account_id?: string | null;
  account_code?: string | null;
  account_type?: AccountRow["account_type"] | null;
  date_from?: string | null;
  date_to?: string | null;
  status?: JournalEntryRow["status"] | "ALL";
  include_inactive?: boolean;
};

export type LedgerResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

export type AccountBalance = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountRow["account_type"];
  account_subtype: string;
  normal_balance: AccountRow["normal_balance"];
  is_cash_account: boolean;
  total_debit: number;
  total_credit: number;
  balance: number;
};

export type LedgerLine = {
  journal_entry_id: string;
  journal_number: string;
  transaction_date: string;
  source_module: JournalEntryRow["source_module"];
  source_id: string;
  journal_description: string;
  status: JournalEntryRow["status"];
  posted_at: string | null;
  line_id: string;
  line_description: string | null;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountRow["account_type"];
  normal_balance: AccountRow["normal_balance"];
  debit: number;
  credit: number;
  signed_amount: number;
  running_balance: number;
  phone_unit_id: string | null;
  seller_id: string | null;
  customer_id: string | null;
};

export async function getLedgerLines(
  supabase: Supabase,
  filters: LedgerFilters,
): Promise<LedgerResult<LedgerLine[]>> {
  const accountsResult = await getFilteredAccounts(supabase, filters);

  if (accountsResult.error) {
    return accountsResult;
  }

  if (!accountsResult.data) {
    return { error: "Accounts were not returned." };
  }

  const accountById = new Map(accountsResult.data.map((account) => [account.id, account]));
  const allowedAccountIds = new Set(accountById.keys());

  if (allowedAccountIds.size === 0) {
    return { data: [] };
  }

  const entriesResult = await getFilteredJournalEntries(supabase, filters);

  if (entriesResult.error) {
    return entriesResult;
  }

  if (!entriesResult.data) {
    return { error: "Journal entries were not returned." };
  }

  const entries = entriesResult.data;

  if (entries.length === 0) {
    return { data: [] };
  }

  const linesResult = await supabase
    .from("journal_lines")
    .select("*")
    .in("journal_entry_id", entries.map((entry) => entry.id))
    .is("deleted_at", null);

  if (linesResult.error) {
    return { error: linesResult.error.message };
  }

  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const runningBalanceByAccount = new Map<string, number>();
  const sortedLines = (linesResult.data ?? [])
    .filter((line) => allowedAccountIds.has(line.account_id))
    .sort((a, b) => compareLedgerLines(a, b, entryById));

  const ledgerLines: LedgerLine[] = [];

  for (const line of sortedLines) {
    const entry = entryById.get(line.journal_entry_id);
    const account = accountById.get(line.account_id);

    if (!entry || !account) {
      continue;
    }

    const signedAmount = calculateSignedAmount(account.normal_balance, line.debit, line.credit);
    const runningBalance = roundMoney((runningBalanceByAccount.get(account.id) ?? 0) + signedAmount);
    runningBalanceByAccount.set(account.id, runningBalance);

    ledgerLines.push({
      journal_entry_id: entry.id,
      journal_number: entry.journal_number,
      transaction_date: entry.transaction_date,
      source_module: entry.source_module,
      source_id: entry.source_id,
      journal_description: entry.description,
      status: entry.status,
      posted_at: entry.posted_at,
      line_id: line.id,
      line_description: line.description,
      account_id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      normal_balance: account.normal_balance,
      debit: line.debit,
      credit: line.credit,
      signed_amount: signedAmount,
      running_balance: runningBalance,
      phone_unit_id: line.phone_unit_id,
      seller_id: line.seller_id,
      customer_id: line.customer_id,
    });
  }

  return { data: ledgerLines };
}

export async function getAccountBalances(
  supabase: Supabase,
  filters: LedgerFilters,
): Promise<LedgerResult<AccountBalance[]>> {
  const accountsResult = await getFilteredAccounts(supabase, filters);

  if (accountsResult.error) {
    return accountsResult;
  }

  if (!accountsResult.data) {
    return { error: "Accounts were not returned." };
  }

  const accounts = accountsResult.data;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const balancesByAccount = new Map<string, AccountBalance>();

  for (const account of accounts) {
    balancesByAccount.set(account.id, {
      account_id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_subtype: account.account_subtype,
      normal_balance: account.normal_balance,
      is_cash_account: account.is_cash_account,
      total_debit: 0,
      total_credit: 0,
      balance: 0,
    });
  }

  if (accounts.length === 0) {
    return { data: [] };
  }

  const entriesResult = await getFilteredJournalEntries(supabase, filters);

  if (entriesResult.error) {
    return entriesResult;
  }

  if (!entriesResult.data) {
    return { error: "Journal entries were not returned." };
  }

  const entries = entriesResult.data;

  if (entries.length === 0) {
    return { data: [...balancesByAccount.values()].sort(compareBalances) };
  }

  const linesResult = await supabase
    .from("journal_lines")
    .select("account_id, debit, credit")
    .in("journal_entry_id", entries.map((entry) => entry.id))
    .is("deleted_at", null);

  if (linesResult.error) {
    return { error: linesResult.error.message };
  }

  for (const line of linesResult.data ?? []) {
    const account = accountById.get(line.account_id);
    const balance = balancesByAccount.get(line.account_id);

    if (!account || !balance) {
      continue;
    }

    balance.total_debit = roundMoney(balance.total_debit + line.debit);
    balance.total_credit = roundMoney(balance.total_credit + line.credit);
    balance.balance = roundMoney(
      balance.balance + calculateSignedAmount(account.normal_balance, line.debit, line.credit),
    );
  }

  return { data: [...balancesByAccount.values()].sort(compareBalances) };
}

export function summarizeBalances(balances: AccountBalance[]) {
  const byType = new Map<
    AccountRow["account_type"],
    { account_type: AccountRow["account_type"]; total_debit: number; total_credit: number; balance: number }
  >();

  for (const balance of balances) {
    const current =
      byType.get(balance.account_type) ??
      { account_type: balance.account_type, total_debit: 0, total_credit: 0, balance: 0 };

    current.total_debit = roundMoney(current.total_debit + balance.total_debit);
    current.total_credit = roundMoney(current.total_credit + balance.total_credit);
    current.balance = roundMoney(current.balance + balance.balance);
    byType.set(balance.account_type, current);
  }

  return {
    by_account_type: [...byType.values()].sort((a, b) =>
      a.account_type.localeCompare(b.account_type),
    ),
    total_debit: roundMoney(balances.reduce((sum, balance) => sum + balance.total_debit, 0)),
    total_credit: roundMoney(balances.reduce((sum, balance) => sum + balance.total_credit, 0)),
  };
}

async function getFilteredAccounts(
  supabase: Supabase,
  filters: LedgerFilters,
): Promise<LedgerResult<AccountRow[]>> {
  let query = supabase
    .from("accounts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("account_code", { ascending: true });

  if (!filters.include_inactive) {
    query = query.eq("is_active", true);
  }

  if (filters.account_id) {
    query = query.eq("id", filters.account_id);
  }

  if (filters.account_code) {
    query = query.eq("account_code", filters.account_code);
  }

  if (filters.account_type) {
    query = query.eq("account_type", filters.account_type);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { data: data ?? [] };
}

async function getFilteredJournalEntries(
  supabase: Supabase,
  filters: LedgerFilters,
): Promise<LedgerResult<JournalEntryRow[]>> {
  let query = supabase
    .from("journal_entries")
    .select("*")
    .is("deleted_at", null)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  } else if (!filters.status) {
    query = query.eq("status", "POSTED");
  }

  if (filters.date_from) {
    query = query.gte("transaction_date", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("transaction_date", filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { data: data ?? [] };
}

function calculateSignedAmount(
  normalBalance: AccountRow["normal_balance"],
  debit: number,
  credit: number,
) {
  const raw = debit - credit;
  return roundMoney(normalBalance === "DEBIT" ? raw : raw * -1);
}

function compareLedgerLines(
  a: JournalLineRow,
  b: JournalLineRow,
  entryById: Map<string, JournalEntryRow>,
) {
  const entryA = entryById.get(a.journal_entry_id);
  const entryB = entryById.get(b.journal_entry_id);
  const dateCompare = (entryA?.transaction_date ?? "").localeCompare(entryB?.transaction_date ?? "");

  if (dateCompare !== 0) {
    return dateCompare;
  }

  const createdCompare = (entryA?.created_at ?? "").localeCompare(entryB?.created_at ?? "");

  if (createdCompare !== 0) {
    return createdCompare;
  }

  return a.created_at.localeCompare(b.created_at);
}

function compareBalances(a: AccountBalance, b: AccountBalance) {
  return a.account_code.localeCompare(b.account_code);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
