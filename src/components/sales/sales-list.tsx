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
import type { CustomerOption, SaleListItem, SaleStatus } from "@/lib/sales-ui/sales-ui-types";

const statusOptions: Array<{ label: string; value: SaleStatus | "" }> = [
  { label: "Semua status", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Returned", value: "RETURNED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function SalesList() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const customerNames = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name])),
    [customers],
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

        const [saleData, customerData] = await Promise.all([
          fetchApi<SaleListItem[]>(`/api/sales?${params.toString()}`, {
            signal: controller.signal,
          }),
          fetchApi<CustomerOption[]>("/api/customers", { signal: controller.signal }),
        ]);

        setSales(saleData);
        setCustomers(customerData);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Data penjualan gagal dimuat.");
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
            placeholder="Nomor sale"
            value={query}
          />
        </div>
        <Link href="/sales/new">
          <Button icon={<Plus size={16} />}>Draft Sale Baru</Button>
        </Link>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : null}
      {loading ? (
        <LoadingState label="Memuat penjualan" />
      ) : (
        <DataTable
          columns={[
            {
              key: "sale",
              header: "Sale",
              render: (row) => (
                <div>
                  <p className="font-semibold text-stone-950">{row.sale_number}</p>
                  <p className="text-xs text-stone-500">{formatDate(row.sale_date)}</p>
                </div>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              render: (row) => customerNames.get(row.customer_id) ?? row.customer_id,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "subtotal",
              header: "Subtotal",
              align: "right",
              render: (row) => formatRupiah(row.subtotal_amount),
            },
            {
              key: "net",
              header: "Net",
              align: "right",
              render: (row) => formatRupiah(row.total_net_amount),
            },
            {
              key: "profit",
              header: "Laba",
              align: "right",
              render: (row) => formatRupiah(row.total_profit_amount),
            },
            {
              key: "action",
              header: "",
              align: "right",
              render: (row) => (
                <Link href={`/sales/${row.id}`}>
                  <Button icon={<Eye size={15} />} variant="secondary">
                    Detail
                  </Button>
                </Link>
              ),
            },
          ]}
          emptyLabel="Belum ada penjualan."
          getRowKey={(row) => row.id}
          rows={sales}
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
