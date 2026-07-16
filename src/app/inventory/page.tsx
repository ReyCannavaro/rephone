import { ModulePage } from "@/components/dashboard/module-page";

export default function InventoryPage() {
  return (
    <ModulePage
      description="Pantau unit yang tersedia, biaya tambahan, harga jual, status stok, dan estimasi margin per unit."
      eyebrow="Stok"
      title="Inventory"
    />
  );
}
