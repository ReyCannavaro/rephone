import type { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/api/responses";
import { getDateString, getOptionalString } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type AuditAction = Database["public"]["Tables"]["audit_logs"]["Row"]["action"];

const auditActions: AuditAction[] = ["CREATE", "UPDATE", "ACCEPT", "REJECT", "SALE", "REVERSAL"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = parseFilters(searchParams);

  if (parsed.error) {
    return parsed.error;
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("event_time", { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.action) {
    query = query.eq("action", parsed.data.action);
  }

  if (parsed.data.entity_table) {
    query = query.ilike("entity_table", `%${parsed.data.entity_table}%`);
  }

  if (parsed.data.date_from) {
    query = query.gte("event_time", `${parsed.data.date_from}T00:00:00.000Z`);
  }

  if (parsed.data.date_to) {
    query = query.lte("event_time", `${parsed.data.date_to}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("AUDIT_LOGS_QUERY_FAILED", error.message, 500);
  }

  return apiOk({
    filters: parsed.data,
    logs: data ?? [],
    count: data?.length ?? 0,
  });
}

function parseFilters(searchParams: URLSearchParams) {
  const actionParam = getOptionalString(searchParams.get("action"));
  const action = actionParam ? getAuditAction(actionParam) : null;

  if (actionParam && !action) {
    return {
      error: apiError(
        "INVALID_AUDIT_ACTION",
        "action must be CREATE, UPDATE, ACCEPT, REJECT, SALE, or REVERSAL.",
      ),
    };
  }

  return {
    data: {
      action,
      entity_table: getOptionalString(searchParams.get("entity_table")),
      date_from: getDateString(searchParams.get("date_from")),
      date_to: getDateString(searchParams.get("date_to")),
      limit: Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200),
    },
  };
}

function getAuditAction(value: string) {
  return auditActions.includes(value as AuditAction) ? (value as AuditAction) : null;
}
