import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("phone_models")
    .select("id, brand_id, model_code, model_name, series_name, release_year, default_sim_type, default_os, is_active")
    .eq("is_active", true)
    .order("model_name", { ascending: true });

  if (error) {
    return apiError("MODELS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
