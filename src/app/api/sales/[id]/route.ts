import { apiError, apiOk } from "@/lib/api/responses";
import { type RouteContextWithId } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const saleResult = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (saleResult.error) {
    return apiError("SALE_NOT_FOUND", "Sale was not found.", 404, saleResult.error.message);
  }

  const [itemsResult, costsResult, returnsResult] = await Promise.all([
    supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("sale_costs")
      .select("*")
      .eq("sale_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("sale_returns")
      .select("*")
      .eq("sale_id", id)
      .is("deleted_at", null)
      .order("return_date", { ascending: false }),
  ]);

  const error = itemsResult.error ?? costsResult.error ?? returnsResult.error;

  if (error) {
    return apiError("SALE_DETAIL_QUERY_FAILED", error.message, 500);
  }

  const unitIds = [...new Set((itemsResult.data ?? []).map((item) => item.phone_unit_id))];
  const unitsResult =
    unitIds.length > 0
      ? await supabase
          .from("phone_units")
          .select("*")
          .in("id", unitIds)
          .is("deleted_at", null)
      : { data: [], error: null };

  if (unitsResult.error) {
    return apiError("SALE_UNITS_QUERY_FAILED", unitsResult.error.message, 500);
  }

  return apiOk({
    sale: saleResult.data,
    items: itemsResult.data ?? [],
    costs: costsResult.data ?? [],
    returns: returnsResult.data ?? [],
    units: unitsResult.data ?? [],
  });
}
