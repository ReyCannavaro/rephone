import { apiError, apiOk } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, account_id, bank_name, account_number_masked, account_holder, opening_balance, is_default_purchase, is_default_sales, is_active")
    .eq("is_active", true)
    .order("bank_name", { ascending: true });

  if (error) {
    return apiError("BANK_ACCOUNTS_QUERY_FAILED", error.message, 500);
  }

  return apiOk(data);
}
