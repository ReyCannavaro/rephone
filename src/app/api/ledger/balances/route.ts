import type { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/api/responses";
import {
  getAccountBalances,
  summarizeBalances,
  type LedgerFilters,
} from "@/lib/ledger/ledger-service";
import { getDateString, getOptionalString } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type AccountType = Database["public"]["Tables"]["accounts"]["Row"]["account_type"];
type JournalStatus = Database["public"]["Tables"]["journal_entries"]["Row"]["status"];

const accountTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "COGS", "EXPENSE"];
const journalStatuses: JournalStatus[] = ["DRAFT", "POSTED", "REVERSED"];

export async function GET(request: NextRequest) {
  const filters = parseBalanceFilters(request.nextUrl.searchParams);

  if (filters.error) {
    return filters.error;
  }

  const supabase = createSupabaseAdminClient();
  const balances = await getAccountBalances(supabase, filters.data);

  if (balances.error) {
    return apiError("ACCOUNT_BALANCES_QUERY_FAILED", balances.error, 500);
  }

  if (!balances.data) {
    return apiError("ACCOUNT_BALANCES_QUERY_FAILED", "Account balances were not returned.", 500);
  }

  const includeZero = request.nextUrl.searchParams.get("include_zero") !== "false";
  const rows = includeZero
    ? balances.data
    : balances.data.filter(
        (balance) =>
          balance.balance !== 0 || balance.total_debit !== 0 || balance.total_credit !== 0,
      );

  return apiOk({
    filters: {
      ...filters.data,
      include_zero: includeZero,
    },
    accounts: rows,
    summary: summarizeBalances(rows),
  });
}

function parseBalanceFilters(searchParams: URLSearchParams) {
  const accountType = getOptionalString(searchParams.get("account_type"));
  const statusParam = getOptionalString(searchParams.get("status"));
  const status = statusParam === "ALL" ? "ALL" : getJournalStatus(statusParam);

  if (accountType && !accountTypes.includes(accountType as AccountType)) {
    return {
      error: apiError(
        "INVALID_ACCOUNT_TYPE",
        "account_type must be ASSET, LIABILITY, EQUITY, REVENUE, COGS, or EXPENSE.",
      ),
    };
  }

  if (statusParam && !status) {
    return {
      error: apiError("INVALID_JOURNAL_STATUS", "status must be DRAFT, POSTED, REVERSED, or ALL."),
    };
  }

  return {
    data: {
      account_id: getOptionalString(searchParams.get("account_id")),
      account_code: getOptionalString(searchParams.get("account_code")),
      account_type: accountType ? (accountType as AccountType) : null,
      date_from: getDateString(searchParams.get("date_from")),
      date_to: getDateString(searchParams.get("date_to")),
      status: status ?? undefined,
      include_inactive: searchParams.get("include_inactive") === "true",
    } satisfies LedgerFilters,
  };
}

function getJournalStatus(value: string | null) {
  if (!value) {
    return null;
  }

  return journalStatuses.includes(value as JournalStatus) ? (value as JournalStatus) : null;
}
