import { ModulePage } from "@/components/dashboard/module-page";
import { ReceiptList } from "@/components/receipts/receipt-list";

export default function ReceiptsPage() {
  return (
    <ModulePage
      description="Kelola penerimaan unit dari seller, checklist inspeksi, keputusan accept/reject, dan dokumen Google Drive."
      eyebrow="Operasional"
      title="Penerimaan Unit"
    >
      <ReceiptList />
    </ModulePage>
  );
}
