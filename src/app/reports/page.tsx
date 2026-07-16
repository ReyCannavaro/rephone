import { ModulePage } from "@/components/dashboard/module-page";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";

export default function ReportsPage() {
  return (
    <ModulePage
      description="Akses dashboard, laporan inventory, profit unit, laba rugi, neraca, dan arus kas."
      eyebrow="Analitik"
      title="Laporan"
    >
      <ReportsWorkspace />
    </ModulePage>
  );
}
