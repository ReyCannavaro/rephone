import type { SupabaseClient } from "@supabase/supabase-js";

import { apiError } from "@/lib/api/responses";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;
type ReceiptStatus = Database["public"]["Tables"]["unit_receipts"]["Row"]["status"];
type StockStatus = Database["public"]["Tables"]["phone_units"]["Row"]["stock_status"];
type InspectionStatus =
  Database["public"]["Tables"]["unit_inspection_results"]["Row"]["result_status"];

const receiptStatuses: ReceiptStatus[] = ["DRAFT", "INSPECTION", "ACCEPTED", "REJECTED"];
const stockStatuses: StockStatus[] = [
  "DRAFT",
  "INSPECTION",
  "REJECTED",
  "IN_STOCK",
  "RESERVED",
  "SOLD",
  "RETURNED",
  "SERVICE",
  "DAMAGED",
  "LOST",
  "WRITTEN_OFF",
];
const inspectionStatuses: NonNullable<InspectionStatus>[] = [
  "OK",
  "MINOR",
  "ISSUE",
  "FAILED",
  "UNKNOWN",
  "NOT_APPLICABLE",
];

type JsonRecord = Record<string, unknown>;

export type RouteContextWithId = {
  params: Promise<{ id: string }>;
};

export type ReceiptDetail = {
  receipt: Database["public"]["Tables"]["unit_receipts"]["Row"];
  units: Database["public"]["Tables"]["phone_units"]["Row"][];
  inspections: Database["public"]["Tables"]["unit_inspection_results"]["Row"][];
  accessories: Database["public"]["Tables"]["unit_accessories"]["Row"][];
  photos: Database["public"]["Tables"]["unit_photos"]["Row"][];
};

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonObject(request: Request) {
  try {
    const body = await request.json();

    if (!isRecord(body)) {
      return { error: apiError("INVALID_BODY", "Request body must be a JSON object.") };
    }

    return { data: body };
  } catch {
    return { error: apiError("INVALID_JSON", "Request body must be valid JSON.") };
  }
}

export function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

export function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function getDateString(value: unknown) {
  const text = getString(value);

  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  return text;
}

export function getStatus<T extends string>(value: unknown, allowed: readonly T[]) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : null;
}

export function validateHttpsUrl(value: string | null, field: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return `${field} must use https.`;
    }
    return null;
  } catch {
    return `${field} must be a valid URL.`;
  }
}

export function generateReceiptNumber(date = new Date()) {
  return `RCP-${formatCompactDate(date)}-${formatCompactTime(date)}`;
}

export function generateStockCode(date = new Date()) {
  return `STK-${formatCompactDate(date)}-${formatCompactTime(date)}`;
}

export function getReceiptStatus(value: unknown, fallback: ReceiptStatus = "DRAFT") {
  return getStatus(value, receiptStatuses) ?? fallback;
}

export function getStockStatus(value: unknown, fallback: StockStatus = "DRAFT") {
  return getStatus(value, stockStatuses) ?? fallback;
}

export function getInspectionStatus(value: unknown) {
  return getStatus(value, inspectionStatuses);
}

export async function fetchReceiptDetail(supabase: Supabase, id: string) {
  const { data: receipt, error: receiptError } = await supabase
    .from("unit_receipts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (receiptError) {
    return { error: receiptError };
  }

  const { data: units, error: unitsError } = await supabase
    .from("phone_units")
    .select("*")
    .eq("receipt_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (unitsError) {
    return { error: unitsError };
  }

  const unitIds = (units ?? []).map((unit) => unit.id);

  if (unitIds.length === 0) {
    return {
      data: {
        receipt,
        units: [],
        inspections: [],
        accessories: [],
        photos: [],
      } satisfies ReceiptDetail,
    };
  }

  const [inspectionResult, accessoryResult, photoResult] = await Promise.all([
    supabase
      .from("unit_inspection_results")
      .select("*")
      .in("phone_unit_id", unitIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("unit_accessories")
      .select("*")
      .in("phone_unit_id", unitIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("unit_photos")
      .select("*")
      .in("phone_unit_id", unitIds)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  const error = inspectionResult.error ?? accessoryResult.error ?? photoResult.error;

  if (error) {
    return { error };
  }

  return {
    data: {
      receipt,
      units: units ?? [],
      inspections: inspectionResult.data ?? [],
      accessories: accessoryResult.data ?? [],
      photos: photoResult.data ?? [],
    } satisfies ReceiptDetail,
  };
}

export async function ensureReceiptCanMove(
  supabase: Supabase,
  id: string,
  blockedStatuses: ReceiptStatus[],
) {
  const detail = await fetchReceiptDetail(supabase, id);

  if (detail.error) {
    return { error: apiError("RECEIPT_NOT_FOUND", "Receipt was not found.", 404, detail.error.message) };
  }

  if (blockedStatuses.includes(detail.data.receipt.status)) {
    return {
      error: apiError(
        "INVALID_RECEIPT_STATUS",
        `Receipt with status ${detail.data.receipt.status} cannot be changed by this action.`,
        409,
      ),
    };
  }

  return { data: detail.data };
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
