import { AuditLogView } from "@/components/audit/audit-log-view";
import { ModulePage } from "@/components/dashboard/module-page";

export default function AuditLogsPage() {
  return (
    <ModulePage
      description="Pantau aktivitas create, update, accept, reject, sale, dan reversal secara read-only."
      eyebrow="Kontrol"
      title="Audit Log"
    >
      <AuditLogView />
    </ModulePage>
  );
}
