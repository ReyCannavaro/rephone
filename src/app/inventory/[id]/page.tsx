import { InventoryDetail } from "@/components/inventory/inventory-detail";
import { ModulePage } from "@/components/dashboard/module-page";

type InventoryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InventoryDetailPage({ params }: InventoryDetailPageProps) {
  const { id } = await params;

  return (
    <ModulePage
      description="Detail unit stok, modal, harga jual, estimasi laba, biaya tambahan, dan riwayat harga."
      eyebrow="Inventory"
      title="Detail Unit"
    >
      <InventoryDetail id={id} />
    </ModulePage>
  );
}
