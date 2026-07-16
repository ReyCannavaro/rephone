import { ArrowRight, ClipboardList, PackageCheck, WalletCards } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRupiah } from "@/lib/format/currency";

const metrics = [
  { label: "Unit dalam stok", value: "0", helper: "Siap dijual" },
  { label: "Penerimaan pending", value: "0", helper: "Perlu inspeksi" },
  { label: "Penjualan bulan ini", value: formatRupiah(0), helper: "Net sales" },
  { label: "Laba bulan ini", value: formatRupiah(0), helper: "Setelah HPP" },
];

const activityRows = [
  {
    id: "setup",
    module: "Backend",
    description: "Schema, RPC, laporan, audit log, dan hardening sudah siap.",
    status: "POSTED",
  },
];

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 border-b border-stone-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-stone-500">Ringkasan bisnis</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">Dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Fondasi frontend siap untuk mengelola alur penerimaan, inventory, penjualan,
            keuangan, dan laporan dari backend Rephone POS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/receipts">
            <Button icon={<ClipboardList size={16} />}>Penerimaan</Button>
          </Link>
          <Link href="/sales">
            <Button icon={<PackageCheck size={16} />} variant="secondary">
              Penjualan
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            className="rounded-md border border-stone-200 bg-white p-4"
            key={metric.label}
          >
            <p className="text-sm font-medium text-stone-600">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-stone-950">{metric.value}</p>
            <p className="mt-1 text-xs text-stone-500">{metric.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-stone-950">Aktivitas terbaru</h3>
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-950"
              href="/reports"
            >
              Lihat laporan
              <ArrowRight size={15} />
            </Link>
          </div>
          <DataTable
            columns={[
              { key: "module", header: "Modul", render: (row) => row.module },
              { key: "description", header: "Aktivitas", render: (row) => row.description },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            getRowKey={(row) => row.id}
            rows={activityRows}
          />
        </div>

        <EmptyState
          action={
            <Link href="/finance">
              <Button icon={<WalletCards size={16} />} variant="secondary">
                Buka Keuangan
              </Button>
            </Link>
          }
          description="Setelah transaksi pertama masuk, panel ini bisa diisi notifikasi saldo, unit butuh harga, atau retur yang perlu dicek."
          title="Belum ada pekerjaan tertunda"
        />
      </section>
    </div>
  );
}
