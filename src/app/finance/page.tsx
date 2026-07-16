import { ModulePage } from "@/components/dashboard/module-page";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";

export default function FinancePage() {
  return (
    <ModulePage
      description="Catat setoran modal, prive, beban operasional, penyesuaian kas, dan validasi saldo rekening."
      eyebrow="Akuntansi"
      title="Keuangan"
    >
      <FinanceWorkspace />
    </ModulePage>
  );
}
