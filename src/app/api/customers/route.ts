import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_code, name, phone, city, address, is_repeat_customer, is_blocked, blocked_reason, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return apiError("CUSTOMERS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
