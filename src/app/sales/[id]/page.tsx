import { ModulePage } from "@/components/dashboard/module-page";
import { SaleDetail } from "@/components/sales/sale-detail";

type SaleDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params;

  return (
    <ModulePage
      description="Detail draft/penjualan, item unit, biaya penjualan, complete sale, dan retur."
      eyebrow="Penjualan"
      title="Detail Sale"
    >
      <SaleDetail id={id} />
    </ModulePage>
  );
}
