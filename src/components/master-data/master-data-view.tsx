"use client";

import { useMemo, useState } from "react";

import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRupiah } from "@/lib/format/currency";
import type {
  AccountReference,
  BrandReference,
  ColorReference,
  CostCategoryReference,
  MasterDataReference,
  PhoneModelReference,
  SalesChannelReference,
  StorageVariantReference,
} from "@/lib/master-data/master-data-service";

type MasterDataViewProps = {
  data: MasterDataReference;
};

type TabId =
  | "brands"
  | "models"
  | "storage"
  | "colors"
  | "accounts"
  | "salesChannels"
  | "costCategories";

type TabItem = {
  id: TabId;
  label: string;
  count: number;
};

export function MasterDataView({ data }: MasterDataViewProps) {
  const tabs = useMemo<TabItem[]>(
    () => [
      { id: "brands", label: "Brand", count: data.brands.length },
      { id: "models", label: "Model", count: data.models.length },
      { id: "storage", label: "Storage", count: data.storageVariants.length },
      { id: "colors", label: "Warna", count: data.colors.length },
      { id: "accounts", label: "Akun", count: data.accounts.length },
      { id: "salesChannels", label: "Sales Channel", count: data.salesChannels.length },
      { id: "costCategories", label: "Cost Category", count: data.costCategories.length },
    ],
    [data],
  );
  const [activeTab, setActiveTab] = useState<TabId>("brands");

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.slice(0, 4).map((tab) => (
          <SummaryTile key={tab.id} label={tab.label} value={tab.count} />
        ))}
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-200 p-3">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                className={[
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                ].join(" ")}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
                <span
                  className={[
                    "rounded px-1.5 py-0.5 text-xs",
                    activeTab === tab.id
                      ? "bg-white/15 text-white"
                      : "bg-white text-stone-600",
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "brands" ? <BrandsTable rows={data.brands} /> : null}
          {activeTab === "models" ? <ModelsTable rows={data.models} /> : null}
          {activeTab === "storage" ? <StorageTable rows={data.storageVariants} /> : null}
          {activeTab === "colors" ? <ColorsTable rows={data.colors} /> : null}
          {activeTab === "accounts" ? <AccountsTable rows={data.accounts} /> : null}
          {activeTab === "salesChannels" ? (
            <SalesChannelsTable rows={data.salesChannels} />
          ) : null}
          {activeTab === "costCategories" ? (
            <CostCategoriesTable rows={data.costCategories} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
      <p className="mt-1 text-xs text-stone-500">Data aktif</p>
    </div>
  );
}

function BrandsTable({ rows }: { rows: BrandReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "code", header: "Kode", render: (row) => row.code },
        { key: "name", header: "Nama", render: (row) => row.name },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
        },
        {
          key: "sort",
          header: "Urutan",
          align: "right",
          render: (row) => row.sort_order,
        },
      ]}
      emptyLabel="Belum ada brand aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}

function ModelsTable({ rows }: { rows: PhoneModelReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "brand", header: "Brand", render: (row) => row.brand_name },
        { key: "model", header: "Model", render: (row) => row.model_name },
        { key: "series", header: "Seri", render: (row) => row.series_name ?? "-" },
        {
          key: "year",
          header: "Tahun",
          align: "right",
          render: (row) => row.release_year ?? "-",
        },
        { key: "sim", header: "SIM", render: (row) => row.default_sim_type ?? "-" },
        { key: "os", header: "OS", render: (row) => row.default_os ?? "-" },
        { key: "code", header: "Kode", render: (row) => row.model_code },
      ]}
      emptyLabel="Belum ada model aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}

function StorageTable({ rows }: { rows: StorageVariantReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "label", header: "Label", render: (row) => row.label },
        {
          key: "capacity",
          header: "Kapasitas",
          align: "right",
          render: (row) => `${row.capacity_gb} GB`,
        },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
        },
        {
          key: "sort",
          header: "Urutan",
          align: "right",
          render: (row) => row.sort_order,
        },
      ]}
      emptyLabel="Belum ada storage aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}

function ColorsTable({ rows }: { rows: ColorReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "brand", header: "Brand", render: (row) => row.brand_name },
        {
          key: "name",
          header: "Warna",
          render: (row) => (
            <span className="inline-flex items-center gap-2">
              <span
                className="size-4 rounded border border-stone-300"
                style={{ backgroundColor: row.hex_code ?? "#ffffff" }}
              />
              {row.name}
            </span>
          ),
        },
        { key: "hex", header: "Hex", render: (row) => row.hex_code ?? "-" },
        {
          key: "sort",
          header: "Urutan",
          align: "right",
          render: (row) => row.sort_order,
        },
      ]}
      emptyLabel="Belum ada warna aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}

function AccountsTable({ rows }: { rows: AccountReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "code", header: "Kode", render: (row) => row.account_code },
        { key: "name", header: "Nama Akun", render: (row) => row.account_name },
        { key: "type", header: "Tipe", render: (row) => <StatusBadge status={row.account_type} /> },
        { key: "subtype", header: "Subtype", render: (row) => row.account_subtype },
        { key: "normal", header: "Normal", render: (row) => row.normal_balance },
        {
          key: "cash",
          header: "Kas/Bank",
          render: (row) => (row.is_cash_account ? "Ya" : "-"),
        },
        {
          key: "manual",
          header: "Manual",
          render: (row) => (row.allow_manual_entry ? "Ya" : "-"),
        },
      ]}
      emptyLabel="Belum ada akun aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}

function SalesChannelsTable({ rows }: { rows: SalesChannelReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "code", header: "Kode", render: (row) => row.code },
        { key: "name", header: "Nama", render: (row) => row.name },
        { key: "fee_type", header: "Fee", render: (row) => row.default_fee_type },
        {
          key: "fee_value",
          header: "Nilai Fee",
          align: "right",
          render: (row) =>
            row.default_fee_type === "PERCENTAGE"
              ? `${row.default_fee_value}%`
              : formatRupiah(row.default_fee_value),
        },
        {
          key: "sort",
          header: "Urutan",
          align: "right",
          render: (row) => row.sort_order,
        },
      ]}
      emptyLabel="Belum ada sales channel aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}

function CostCategoriesTable({ rows }: { rows: CostCategoryReference[] }) {
  return (
    <DataTable
      columns={[
        { key: "scope", header: "Scope", render: (row) => <StatusBadge status={row.scope} /> },
        { key: "code", header: "Kode", render: (row) => row.code },
        { key: "name", header: "Nama", render: (row) => row.name },
        {
          key: "expense",
          header: "Akun Beban",
          render: (row) => row.expense_account_name ?? "-",
        },
        {
          key: "inventory",
          header: "Akun Persediaan",
          render: (row) => row.inventory_account_name ?? "-",
        },
        {
          key: "sort",
          header: "Urutan",
          align: "right",
          render: (row) => row.sort_order,
        },
      ]}
      emptyLabel="Belum ada cost category aktif."
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}
