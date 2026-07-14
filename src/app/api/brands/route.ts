import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("brands")
      .select("id, code, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return apiError("BRANDS_QUERY_FAILED", error.message, 500);
    }

    return apiOk(data);
  } catch (error) {
    return apiError(
      "BACKEND_NOT_CONFIGURED",
      "Supabase environment variables are not configured yet.",
      503,
      error instanceof Error ? error.message : error,
    );
  }
}
