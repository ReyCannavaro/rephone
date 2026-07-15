import type { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/api/responses";
import { getReportPeriod } from "@/lib/reports/report-route";
import { getProfitLossReport } from "@/lib/reports/report-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const period = getReportPeriod(request.nextUrl.searchParams);
  const report = await getProfitLossReport(supabase, period);

  if (report.error) {
    return apiError("PROFIT_LOSS_REPORT_FAILED", report.error, 500);
  }

  return apiOk(report.data);
}
