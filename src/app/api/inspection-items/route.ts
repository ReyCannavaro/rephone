import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("inspection_items")
    .select("id, code, category, name, input_type, unit_label, is_required, applies_to_brand_id, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return apiError("INSPECTION_ITEMS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
