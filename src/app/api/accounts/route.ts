import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_code, account_name, account_type, account_subtype, parent_id, normal_balance, allow_manual_entry, is_cash_account, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return apiError("ACCOUNTS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
