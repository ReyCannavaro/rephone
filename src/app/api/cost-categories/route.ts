import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cost_categories")
    .select("id, code, name, scope, expense_account_id, inventory_account_id, is_active, sort_order")
    .eq("is_active", true)
    .order("scope", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return apiError("COST_CATEGORIES_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
