import { apiError, apiOk } from "@/lib/api/responses";
import { type RouteContextWithId } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const unitResult = await supabase
    .from("phone_units")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (unitResult.error) {
    return apiError("UNIT_NOT_FOUND", "Unit was not found.", 404, unitResult.error.message);
  }

  const [receiptResult, costsResult, pricesResult] = await Promise.all([
    unitResult.data.receipt_id
      ? supabase
          .from("unit_receipts")
          .select("*")
          .eq("id", unitResult.data.receipt_id)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("unit_costs")
      .select("*")
      .eq("phone_unit_id", id)
      .is("deleted_at", null)
      .order("cost_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("unit_price_histories")
      .select("*")
      .eq("phone_unit_id", id)
      .is("deleted_at", null)
      .order("effective_at", { ascending: false }),
  ]);

  const error = receiptResult.error ?? costsResult.error ?? pricesResult.error;

  if (error) {
    return apiError("UNIT_DETAIL_QUERY_FAILED", error.message, 500);
  }

  return apiOk({
    unit: unitResult.data,
    receipt: receiptResult.data,
    costs: costsResult.data ?? [],
    price_histories: pricesResult.data ?? [],
  });
}
