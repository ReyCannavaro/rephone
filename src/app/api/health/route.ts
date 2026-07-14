import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("brands")
      .select("id")
      .limit(1);

    if (error) {
      return apiOk({
        app: "ok",
        database: "schema_missing_or_unreachable",
        message: error.message,
      });
    }

    return apiOk({
      app: "ok",
      database: "ready",
    });
  } catch (error) {
    return apiError(
      "BACKEND_NOT_CONFIGURED",
      "Supabase environment variables are not configured yet.",
      503,
      error instanceof Error ? error.message : error,
    );
  }
}
