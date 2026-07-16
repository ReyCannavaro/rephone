"use client";

import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SelectField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type { ReceiptListItem, ReceiptStatus, SellerOption } from "@/lib/receipts/receipt-ui-types";

const statusOptions: Array<{ label: string; value: ReceiptStatus | "" }> = [
  { label: "Semua status", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Inspection", value: "INSPECTION" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
];

export function ReceiptList() {
  const [rows, setRows] = useState<ReceiptListItem[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const sellerNames = useMemo(
    () => new Map(sellers.map((seller) => [seller.id, seller.name])),
    [sellers],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ limit: "100" });
        if (status) {
          params.set("status", status);
        }
        if (query.trim()) {
          params.set("q", query.trim());
        }

        const [receiptsData, sellersData] = await Promise.all([
          fetchApi<ReceiptListItem[]>(`/api/receipts?${params.toString()}`, {
            signal: controller.signal,
          }),
          fetchApi<SellerOption[]>("/api/sellers", {
            signal: controller.signal,
          }),
        ]);

        setRows(receiptsData);
        setSellers(sellersData);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Receipt gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [query, reloadKey, status]);

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[220px_minmax(240px,1fr)]">
          <SelectField
            label="Status"
            onChange={(event) => setStatus(event.target.value)}
            options={statusOptions}
            value={status}
          />
          <TextInput
            label="Cari"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nomor receipt"
            value={query}
          />
        </div>
        <Link href="/receipts/new">
          <Button icon={<Plus size={16} />}>Penerimaan Baru</Button>
        </Link>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : null}
      {loading ? (
        <LoadingState label="Memuat receipt" />
      ) : (
        <DataTable
          columns={[
            {
              key: "number",
              header: "Receipt",
              render: (row) => (
                <div>
                  <p className="font-semibold text-stone-950">{row.receipt_number}</p>
                  <p className="text-xs text-stone-500">{formatDate(row.receipt_date)}</p>
                </div>
              ),
            },
            {
              key: "seller",
              header: "Seller",
              render: (row) => sellerNames.get(row.seller_id) ?? row.seller_id,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "purchase",
              header: "Harga Beli",
              align: "right",
              render: (row) => formatRupiah(row.total_purchase_amount),
            },
            {
              key: "cost",
              header: "Total Cost",
              align: "right",
              render: (row) => formatRupiah(row.total_unit_cost),
            },
            {
              key: "action",
              header: "",
              align: "right",
              render: (row) => (
                <Link href={`/receipts/${row.id}`}>
                  <Button icon={<Eye size={15} />} variant="secondary">
                    Detail
                  </Button>
                </Link>
              ),
            },
          ]}
          emptyLabel="Belum ada penerimaan unit."
          getRowKey={(row) => row.id}
          rows={rows}
        />
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
