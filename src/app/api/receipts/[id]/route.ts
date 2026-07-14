import { apiError, apiOk } from "@/lib/api/responses";
import { fetchReceiptDetail, type RouteContextWithId } from "@/lib/receipts/receipt-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContextWithId) {
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await fetchReceiptDetail(supabase, id);

  if (error) {
    return apiError("RECEIPT_NOT_FOUND", "Receipt was not found.", 404, error.message);
  }

  return apiOk(data);
}
