import { ModulePage } from "@/components/dashboard/module-page";
import { SalesList } from "@/components/sales/sales-list";

export default function SalesPage() {
  return (
    <ModulePage
      description="Buat draft penjualan, complete sale, catat biaya penjualan, dan proses retur saat diperlukan."
      eyebrow="Transaksi"
      title="Penjualan"
    >
      <SalesList />
    </ModulePage>
  );
}
