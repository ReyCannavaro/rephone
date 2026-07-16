import { ModulePage } from "@/components/dashboard/module-page";
import { SaleCreateForm } from "@/components/sales/sale-create-form";

export default function NewSalePage() {
  return (
    <ModulePage
      description="Buat draft penjualan dari unit yang berstatus IN_STOCK atau RESERVED."
      eyebrow="Penjualan"
      title="Draft Sale Baru"
    >
      <SaleCreateForm />
    </ModulePage>
  );
}
