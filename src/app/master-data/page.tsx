import { ModulePage } from "@/components/dashboard/module-page";
import { MasterDataView } from "@/components/master-data/master-data-view";
import { ErrorState } from "@/components/ui/state-view";
import {
  getMasterDataReference,
  type MasterDataReference,
} from "@/lib/master-data/master-data-service";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  const result = await loadMasterData();

  return (
    <ModulePage
      description="Referensi brand, model, storage, warna, akun, kategori biaya, channel penjualan, dan checklist inspeksi."
      eyebrow="Referensi"
      title="Master Data"
    >
      {result.ok ? (
        <MasterDataView data={result.data} />
      ) : (
        <ErrorState message={result.error} title="Gagal memuat master data" />
      )}
    </ModulePage>
  );
}

async function loadMasterData(): Promise<
  | { ok: true; data: MasterDataReference }
  | { ok: false; error: string }
> {
  try {
    const data = await getMasterDataReference();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Master data belum bisa dimuat.",
    };
  }
}
