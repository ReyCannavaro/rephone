import { getDateString } from "@/lib/receipts/receipt-service";
import type { ReportPeriod } from "@/lib/reports/report-service";

export function getReportPeriod(searchParams: URLSearchParams): ReportPeriod {
  return {
    date_from: getDateString(searchParams.get("date_from")),
    date_to: getDateString(searchParams.get("date_to")),
    as_of: getDateString(searchParams.get("as_of")),
  };
}
