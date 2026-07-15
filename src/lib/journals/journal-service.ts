import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;
type JournalEntryInsert = Database["public"]["Tables"]["journal_entries"]["Insert"];
type JournalLineInsert = Database["public"]["Tables"]["journal_lines"]["Insert"];
type JournalSourceModule = Database["public"]["Tables"]["journal_entries"]["Row"]["source_module"];

type CreateJournalLineInput = {
  account_id: string;
  description?: string | null;
  debit?: number;
  credit?: number;
  phone_unit_id?: string | null;
  seller_id?: string | null;
  customer_id?: string | null;
};

type CreateJournalInput = {
  transaction_date: string;
  source_module: JournalSourceModule;
  source_id: string;
  description: string;
  lines: CreateJournalLineInput[];
  journal_number?: string;
  notes?: string | null;
  reversed_entry_id?: string | null;
};

export type JournalServiceResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

export async function createPostedJournal(
  supabase: Supabase,
  input: CreateJournalInput,
): Promise<JournalServiceResult<Database["public"]["Tables"]["journal_entries"]["Row"]>> {
  const normalizedLines = input.lines.map((line) => ({
    ...line,
    debit: normalizeMoney(line.debit),
    credit: normalizeMoney(line.credit),
  }));
  const totalDebit = sumMoney(normalizedLines.map((line) => line.debit));
  const totalCredit = sumMoney(normalizedLines.map((line) => line.credit));

  if (normalizedLines.length < 2) {
    return { error: "Journal requires at least two lines." };
  }

  const invalidLine = normalizedLines.find(
    (line) => (line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0),
  );

  if (invalidLine) {
    return { error: "Each journal line must have debit or credit, but not both." };
  }

  if (totalDebit !== totalCredit) {
    return { error: "Journal total debit and credit must be balanced." };
  }

  const now = new Date().toISOString();
  const entryPayload: JournalEntryInsert = {
    journal_number: input.journal_number ?? generateJournalNumber(input.source_module),
    transaction_date: input.transaction_date,
    source_module: input.source_module,
    source_id: input.source_id,
    description: input.description,
    status: "POSTED",
    total_debit: totalDebit,
    total_credit: totalCredit,
    posted_at: now,
    reversed_entry_id: input.reversed_entry_id ?? null,
    notes: input.notes ?? null,
  };

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert(entryPayload)
    .select()
    .single();

  if (entryError) {
    return { error: entryError.message };
  }

  const linesPayload: JournalLineInsert[] = normalizedLines.map((line) => ({
    journal_entry_id: entry.id,
    account_id: line.account_id,
    description: line.description ?? input.description,
    debit: line.debit,
    credit: line.credit,
    phone_unit_id: line.phone_unit_id ?? null,
    seller_id: line.seller_id ?? null,
    customer_id: line.customer_id ?? null,
  }));

  const { error: linesError } = await supabase.from("journal_lines").insert(linesPayload);

  if (linesError) {
    await supabase
      .from("journal_entries")
      .update({ deleted_at: new Date().toISOString(), status: "REVERSED" })
      .eq("id", entry.id);

    return { error: linesError.message };
  }

  return { data: entry };
}

export async function getAccountIdByCode(
  supabase: Supabase,
  accountCode: string,
): Promise<JournalServiceResult<string>> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("account_code", accountCode)
    .eq("is_active", true)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data.id };
}

export function generateJournalNumber(sourceModule: JournalSourceModule, date = new Date()) {
  return `JRN-${sourceModule}-${formatCompactDate(date)}-${formatCompactTime(date)}`;
}

function normalizeMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

function sumMoney(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
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
