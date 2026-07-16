"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SelectField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type { InventoryUnit } from "@/lib/inventory/inventory-ui-types";
import type {
  BrandOption,
  ColorOption,
  ModelOption,
  PhysicalConditionOption,
  StorageOption,
} from "@/lib/receipts/receipt-ui-types";

type ReferenceMaps = {
  brands: Map<string, string>;
  models: Map<string, string>;
  storage: Map<string, string>;
  colors: Map<string, string>;
  physical: Map<string, string>;
};

const statusOptions = [
  { label: "Semua status", value: "" },
  { label: "In Stock", value: "IN_STOCK" },
  { label: "Reserved", value: "RESERVED" },
  { label: "Service", value: "SERVICE" },
  { label: "Damaged", value: "DAMAGED" },
  { label: "Sold", value: "SOLD" },
  { label: "Draft", value: "DRAFT" },
  { label: "Inspection", value: "INSPECTION" },
  { label: "Rejected", value: "REJECTED" },
];

export function InventoryList() {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [refs, setRefs] = useState<ReferenceMaps | null>(null);
  const [status, setStatus] = useState("IN_STOCK");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ limit: "200" });
        if (status) {
          params.set("status", status);
        }
        if (query.trim()) {
          params.set("q", query.trim());
        }

        const [unitData, brands, models, storageVariants, colors, physicalConditions] =
          await Promise.all([
            fetchApi<InventoryUnit[]>(`/api/units?${params.toString()}`, {
              signal: controller.signal,
            }),
            fetchApi<BrandOption[]>("/api/brands", { signal: controller.signal }),
            fetchApi<ModelOption[]>("/api/models", { signal: controller.signal }),
            fetchApi<StorageOption[]>("/api/storage-variants", { signal: controller.signal }),
            fetchApi<ColorOption[]>("/api/colors", { signal: controller.signal }),
            fetchApi<PhysicalConditionOption[]>("/api/physical-conditions", {
              signal: controller.signal,
            }),
          ]);

        setUnits(unitData);
        setRefs({
          brands: new Map(brands.map((item) => [item.id, item.name])),
          models: new Map(models.map((item) => [item.id, item.model_name])),
          storage: new Map(storageVariants.map((item) => [item.id, item.label])),
          colors: new Map(colors.map((item) => [item.id, item.name])),
          physical: new Map(physicalConditions.map((item) => [item.id, item.name])),
        });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Inventory gagal dimuat.");
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

  const summary = useMemo(() => {
    const totalCost = units.reduce((sum, unit) => sum + unit.total_unit_cost, 0);
    const listingValue = units.reduce((sum, unit) => sum + (unit.current_listing_price ?? 0), 0);
    const minimumValue = units.reduce((sum, unit) => sum + (unit.minimum_price ?? 0), 0);

    return {
      units: units.length,
      totalCost,
      listingValue,
      minimumValue,
      listingProfit: listingValue - totalCost,
      minimumProfit: minimumValue - totalCost,
    };
  }, [units]);

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Unit" value={String(summary.units)} />
        <SummaryTile label="Total Modal" value={formatRupiah(summary.totalCost)} />
        <SummaryTile label="Harga Pasang" value={formatRupiah(summary.listingValue)} />
        <SummaryTile label="Estimasi Laba" value={formatRupiah(summary.listingProfit)} />
      </section>

      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-[220px_minmax(260px,1fr)]">
        <SelectField
          label="Status"
          onChange={(event) => setStatus(event.target.value)}
          options={statusOptions}
          value={status}
        />
        <TextInput
          label="Cari Unit"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Stock code, IMEI, serial"
          value={query}
        />
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : null}
      {loading || !refs ? (
        <LoadingState label="Memuat inventory" />
      ) : (
        <DataTable
          columns={[
            {
              key: "unit",
              header: "Unit",
              render: (row) => (
                <div>
                  <p className="font-semibold text-stone-950">{row.stock_code}</p>
                  <p className="text-xs text-stone-500">{row.imei_1}</p>
                </div>
              ),
            },
            {
              key: "model",
              header: "Model",
              render: (row) => (
                <div>
                  <p>{refs.models.get(row.model_id) ?? "-"}</p>
                  <p className="text-xs text-stone-500">
                    {refs.brands.get(row.brand_id) ?? "-"} /{" "}
                    {row.storage_variant_id ? refs.storage.get(row.storage_variant_id) : "-"} /{" "}
                    {row.color_id ? refs.colors.get(row.color_id) : "-"}
                  </p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.stock_status} />,
            },
            {
              key: "cost",
              header: "Total Modal",
              align: "right",
              render: (row) => formatRupiah(row.total_unit_cost),
            },
            {
              key: "listing",
              header: "Harga Pasang",
              align: "right",
              render: (row) => formatRupiah(row.current_listing_price ?? 0),
            },
            {
              key: "minimum",
              header: "Harga Minimal",
              align: "right",
              render: (row) => formatRupiah(row.minimum_price ?? 0),
            },
            {
              key: "profit",
              header: "Estimasi Laba",
              align: "right",
              render: (row) => formatRupiah((row.current_listing_price ?? 0) - row.total_unit_cost),
            },
            {
              key: "action",
              header: "",
              align: "right",
              render: (row) => (
                <Link href={`/inventory/${row.id}`}>
                  <Button icon={<Eye size={15} />} variant="secondary">
                    Detail
                  </Button>
                </Link>
              ),
            },
          ]}
          emptyLabel="Belum ada unit untuk filter ini."
          getRowKey={(row) => row.id}
          rows={units}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
