import { ModulePage } from "@/components/dashboard/module-page";
import { ReceiptCreateForm } from "@/components/receipts/receipt-create-form";

export default function NewReceiptPage() {
  return (
    <ModulePage
      description="Buat penerimaan unit dari seller, spesifikasi unit, harga beli, dokumen pembayaran, dan aksesori awal."
      eyebrow="Penerimaan"
      title="Penerimaan Unit Baru"
    >
      <ReceiptCreateForm />
    </ModulePage>
  );
}
