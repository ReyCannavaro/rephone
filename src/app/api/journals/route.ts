import { apiError, apiOk } from "@/lib/api/responses";
import { getDateString, getOptionalString } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type JournalSourceModule = Database["public"]["Tables"]["journal_entries"]["Row"]["source_module"];

const journalSourceModules: JournalSourceModule[] = [
  "RECEIPT",
  "UNIT_COST",
  "SALE",
  "SALE_RETURN",
  "CAPITAL",
  "OWNER_DRAWING",
  "OPERATING_EXPENSE",
  "CASH_ADJUSTMENT",
  "MANUAL",
];

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const sourceModuleParam = getOptionalString(searchParams.get("source_module"));
  const sourceModule = journalSourceModules.includes(sourceModuleParam as JournalSourceModule)
    ? (sourceModuleParam as JournalSourceModule)
    : null;
  const sourceId = getOptionalString(searchParams.get("source_id"));
  const dateFrom = getDateString(searchParams.get("date_from"));
  const dateTo = getDateString(searchParams.get("date_to"));
  const includeLines = searchParams.get("includeLines") === "true";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 100);

  let query = supabase
    .from("journal_entries")
    .select(
      includeLines
        ? "*, journal_lines(*)"
        : "id, journal_number, transaction_date, source_module, source_id, description, status, total_debit, total_credit, posted_at, created_at",
    )
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sourceModule) {
    query = query.eq("source_module", sourceModule);
  }

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  if (dateFrom) {
    query = query.gte("transaction_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("transaction_date", dateTo);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("JOURNALS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
