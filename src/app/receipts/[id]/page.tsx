import { ModulePage } from "@/components/dashboard/module-page";
import { ReceiptDetail } from "@/components/receipts/receipt-detail";

type ReceiptDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReceiptDetailPage({ params }: ReceiptDetailPageProps) {
  const { id } = await params;

  return (
    <ModulePage
      description="Detail penerimaan unit, checklist inspeksi, dokumen pendukung, dan keputusan accept/reject."
      eyebrow="Penerimaan"
      title="Detail Receipt"
    >
      <ReceiptDetail id={id} />
    </ModulePage>
  );
}
