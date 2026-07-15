import { apiError, apiOk } from "@/lib/api/responses";
import { getInventoryReport } from "@/lib/reports/report-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const report = await getInventoryReport(supabase);

  if (report.error) {
    return apiError("INVENTORY_REPORT_FAILED", report.error, 500);
  }

  return apiOk(report.data);
}
