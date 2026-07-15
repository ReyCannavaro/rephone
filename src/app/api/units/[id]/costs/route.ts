import { apiError, apiOk } from "@/lib/api/responses";
import { writeAuditLog } from "@/lib/audit/audit-service";
import { createPostedJournal, getAccountIdByCode } from "@/lib/journals/journal-service";
import {
  getDateString,
  getNumber,
  getOptionalString,
  getString,
  readJsonObject,
  validateHttpsUrl,
  type RouteContextWithId,
} from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type UnitCostInsert = Database["public"]["Tables"]["unit_costs"]["Insert"];

const blockedCostStatuses = ["SOLD", "REJECTED", "LOST", "WRITTEN_OFF"] as const;

export async function POST(request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const parsed = await readJsonObject(request);

  if (parsed.error) {
    return parsed.error;
  }

  const body = parsed.data;
  const costCategoryId = getString(body.cost_category_id);
  const costDate = getDateString(body.cost_date);
  const description = getString(body.description);
  const amount = getNumber(body.amount);
  const paymentAccountId = getString(body.payment_account_id);
  const proofUrl = getOptionalString(body.proof_url);
  const urlError = validateHttpsUrl(proofUrl, "proof_url");

  if (urlError) {
    return apiError("INVALID_URL", urlError);
  }

  if (!costCategoryId || !costDate || !description || amount <= 0 || !paymentAccountId) {
    return apiError(
      "MISSING_REQUIRED_FIELDS",
      "cost_category_id, cost_date, description, amount > 0, and payment_account_id are required.",
    );
  }

  const supabase = createSupabaseAdminClient();
  const unitResult = await supabase
    .from("phone_units")
    .select("id, stock_code, stock_status, total_unit_cost, receipt_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (unitResult.error) {
    return apiError("UNIT_NOT_FOUND", "Unit was not found.", 404, unitResult.error.message);
  }

  const unit = unitResult.data;

  if (blockedCostStatuses.includes(unit.stock_status as (typeof blockedCostStatuses)[number])) {
    return apiError(
      "UNIT_STATUS_BLOCKED",
      `Cannot add cost to unit with status ${unit.stock_status}.`,
      409,
    );
  }

  const categoryResult = await supabase
    .from("cost_categories")
    .select("id, code, name, scope, inventory_account_id")
    .eq("id", costCategoryId)
    .eq("is_active", true)
    .single();

  if (categoryResult.error) {
    return apiError("COST_CATEGORY_NOT_FOUND", "Cost category was not found.", 404, categoryResult.error.message);
  }

  if (categoryResult.data.scope !== "UNIT") {
    return apiError("INVALID_COST_SCOPE", "Only UNIT cost categories can be added to phone units.", 409);
  }

  const paymentAccountResult = await supabase
    .from("accounts")
    .select("id, is_cash_account, is_active")
    .eq("id", paymentAccountId)
    .single();

  if (paymentAccountResult.error) {
    return apiError("PAYMENT_ACCOUNT_NOT_FOUND", "Payment account was not found.", 404, paymentAccountResult.error.message);
  }

  if (!paymentAccountResult.data.is_active || !paymentAccountResult.data.is_cash_account) {
    return apiError("INVALID_PAYMENT_ACCOUNT", "Payment account must be an active cash/bank account.", 409);
  }

  const inventoryAccountId = categoryResult.data.inventory_account_id
    ? { data: categoryResult.data.inventory_account_id }
    : await getAccountIdByCode(supabase, "1201");

  if ("error" in inventoryAccountId && inventoryAccountId.error) {
    return apiError("INVENTORY_ACCOUNT_NOT_FOUND", inventoryAccountId.error, 500);
  }

  if (!inventoryAccountId.data) {
    return apiError("INVENTORY_ACCOUNT_NOT_FOUND", "Inventory account is not configured.", 500);
  }

  const costPayload: UnitCostInsert = {
    cost_number: getOptionalString(body.cost_number) ?? generateUnitCostNumber(),
    phone_unit_id: id,
    cost_category_id: costCategoryId,
    cost_date: costDate,
    description,
    amount,
    payment_account_id: paymentAccountId,
    is_paid: true,
    proof_url: proofUrl,
    proof_filename: getOptionalString(body.proof_filename),
    notes: getOptionalString(body.notes),
  };

  const costResult = await supabase.from("unit_costs").insert(costPayload).select().single();

  if (costResult.error) {
    return apiError("UNIT_COST_CREATE_FAILED", costResult.error.message, 500);
  }

  const nextTotalUnitCost = Math.round((unit.total_unit_cost + amount) * 100) / 100;
  const unitUpdate = await supabase
    .from("phone_units")
    .update({ total_unit_cost: nextTotalUnitCost, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, stock_code, total_unit_cost")
    .single();

  if (unitUpdate.error) {
    await supabase
      .from("unit_costs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", costResult.data.id);

    return apiError("UNIT_COST_TOTAL_UPDATE_FAILED", unitUpdate.error.message, 500);
  }

  const journal = await createPostedJournal(supabase, {
    transaction_date: costDate,
    source_module: "UNIT_COST",
    source_id: costResult.data.id,
    description: `Biaya unit ${unit.stock_code}: ${description}`,
    lines: [
      {
        account_id: inventoryAccountId.data,
        description,
        debit: amount,
        credit: 0,
        phone_unit_id: id,
      },
      {
        account_id: paymentAccountId,
        description,
        debit: 0,
        credit: amount,
        phone_unit_id: id,
      },
    ],
  });

  if (journal.error || !journal.data) {
    await supabase
      .from("phone_units")
      .update({ total_unit_cost: unit.total_unit_cost, updated_at: new Date().toISOString() })
      .eq("id", id);
    await supabase
      .from("unit_costs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", costResult.data.id);

    return apiError("UNIT_COST_JOURNAL_CREATE_FAILED", journal.error ?? "Journal was not created.", 500);
  }

  const linkedCost = await supabase
    .from("unit_costs")
    .update({ journal_entry_id: journal.data.id, updated_at: new Date().toISOString() })
    .eq("id", costResult.data.id)
    .select()
    .single();

  if (linkedCost.error) {
    return apiError("UNIT_COST_JOURNAL_LINK_FAILED", linkedCost.error.message, 500);
  }

  await writeAuditLog(supabase, {
    request,
    action: "CREATE",
    entity_table: "unit_costs",
    entity_id: linkedCost.data.id,
    reason: getOptionalString(body.audit_reason) ?? description,
    old_values: {
      unit: {
        id: unit.id,
        stock_code: unit.stock_code,
        total_unit_cost: unit.total_unit_cost,
      },
    },
    new_values: {
      cost: linkedCost.data,
      unit: unitUpdate.data,
    },
    metadata: {
      phone_unit_id: id,
      journal_entry_id: journal.data.id,
    },
  });

  return apiOk(
    {
      cost: linkedCost.data,
      unit: unitUpdate.data,
      journal: journal.data,
    },
    { status: 201 },
  );
}

function generateUnitCostNumber(date = new Date()) {
  return `CST-${formatCompactDate(date)}-${formatCompactTime(date)}`;
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
