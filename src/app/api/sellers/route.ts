import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sellers")
    .select("id, seller_code, name, phone, identity_number, city, address, source_channel, risk_flag, risk_notes, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return apiError("SELLERS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
