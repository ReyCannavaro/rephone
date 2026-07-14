import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sales_channels")
    .select("id, code, name, default_fee_type, default_fee_value, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return apiError("SALES_CHANNELS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
