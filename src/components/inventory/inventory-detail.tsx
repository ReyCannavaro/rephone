"use client";

import { ArrowLeft, ExternalLink, Plus, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type {
  AccountOption,
  CostCategoryOption,
  InventoryUnitDetail as InventoryUnitDetailData,
} from "@/lib/inventory/inventory-ui-types";
import type {
  BrandOption,
  ColorOption,
  ModelOption,
  PhysicalConditionOption,
  StorageOption,
} from "@/lib/receipts/receipt-ui-types";

type InventoryDetailProps = {
  id: string;
};

type References = {
  brands: Map<string, string>;
  models: Map<string, string>;
  storage: Map<string, string>;
  colors: Map<string, string>;
  physical: Map<string, string>;
  costCategories: CostCategoryOption[];
  accounts: AccountOption[];
  categoryNames: Map<string, string>;
  accountNames: Map<string, string>;
};

export function InventoryDetail({ id }: InventoryDetailProps) {
  const [detail, setDetail] = useState<InventoryUnitDetailData | null>(null);
  const [refs, setRefs] = useState<References | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savingCost, setSavingCost] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [costForm, setCostForm] = useState({
    cost_category_id: "",
    cost_date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    payment_account_id: "",
    proof_url: "",
    notes: "",
  });
  const [priceForm, setPriceForm] = useState({
    listing_price: "",
    minimum_price: "",
    reason: "",
    notes: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          unitDetail,
          brands,
          models,
          storageVariants,
          colors,
          physicalConditions,
          costCategories,
          accounts,
        ] = await Promise.all([
          fetchApi<InventoryUnitDetailData>(`/api/units/${id}`, { signal: controller.signal }),
          fetchApi<BrandOption[]>("/api/brands", { signal: controller.signal }),
          fetchApi<ModelOption[]>("/api/models", { signal: controller.signal }),
          fetchApi<StorageOption[]>("/api/storage-variants", { signal: controller.signal }),
          fetchApi<ColorOption[]>("/api/colors", { signal: controller.signal }),
          fetchApi<PhysicalConditionOption[]>("/api/physical-conditions", {
            signal: controller.signal,
          }),
          fetchApi<CostCategoryOption[]>("/api/cost-categories", { signal: controller.signal }),
          fetchApi<AccountOption[]>("/api/accounts", { signal: controller.signal }),
        ]);

        const unitCostCategories = costCategories.filter((category) => category.scope === "UNIT");
        const cashAccounts = accounts.filter((account) => account.is_cash_account);

        setDetail(unitDetail);
        setRefs({
          brands: new Map(brands.map((item) => [item.id, item.name])),
          models: new Map(models.map((item) => [item.id, item.model_name])),
          storage: new Map(storageVariants.map((item) => [item.id, item.label])),
          colors: new Map(colors.map((item) => [item.id, item.name])),
          physical: new Map(physicalConditions.map((item) => [item.id, item.name])),
          costCategories: unitCostCategories,
          accounts: cashAccounts,
          categoryNames: new Map(costCategories.map((item) => [item.id, item.name])),
          accountNames: new Map(
            accounts.map((item) => [item.id, `${item.account_code} - ${item.account_name}`]),
          ),
        });
        setCostForm((current) => ({
          ...current,
          cost_category_id: current.cost_category_id || unitCostCategories[0]?.id || "",
          payment_account_id: current.payment_account_id || cashAccounts[0]?.id || "",
        }));
        setPriceForm((current) => ({
          ...current,
          listing_price:
            current.listing_price || String(unitDetail.unit.current_listing_price ?? ""),
          minimum_price: current.minimum_price || String(unitDetail.unit.minimum_price ?? ""),
        }));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Detail unit gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [id, reloadKey]);

  const estimates = useMemo(() => {
    const cost = detail?.unit.total_unit_cost ?? 0;
    const listing = detail?.unit.current_listing_price ?? 0;
    const minimum = detail?.unit.minimum_price ?? 0;

    return {
      cost,
      listing,
      minimum,
      listingProfit: listing - cost,
      minimumProfit: minimum - cost,
    };
  }, [detail]);

  async function submitCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCost(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(`/api/units/${id}/costs`, {
        body: JSON.stringify({
          cost_category_id: costForm.cost_category_id,
          cost_date: costForm.cost_date,
          description: costForm.description,
          amount: Number(costForm.amount),
          payment_account_id: costForm.payment_account_id,
          proof_url: optional(costForm.proof_url),
          notes: optional(costForm.notes),
        }),
        method: "POST",
      });
      setNotice("Biaya unit berhasil ditambahkan.");
      setCostForm((current) => ({
        ...current,
        description: "",
        amount: "",
        proof_url: "",
        notes: "",
      }));
      setReloadKey((value) => value + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Biaya gagal disimpan.");
    } finally {
      setSavingCost(false);
    }
  }

  async function submitPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPrice(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(`/api/units/${id}/prices`, {
        body: JSON.stringify({
          listing_price: Number(priceForm.listing_price),
          minimum_price: Number(priceForm.minimum_price),
          reason: optional(priceForm.reason),
          notes: optional(priceForm.notes),
        }),
        method: "POST",
      });
      setNotice("Harga jual berhasil diperbarui.");
      setPriceForm((current) => ({ ...current, reason: "", notes: "" }));
      setReloadKey((value) => value + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Harga gagal disimpan.");
    } finally {
      setSavingPrice(false);
    }
  }

  if (loading) {
    return <LoadingState label="Memuat detail inventory" />;
  }

  if (!detail || !refs) {
    return <ErrorState message={error || "Detail unit belum tersedia."} />;
  }

  const unit = detail.unit;
  const blockedAction = ["SOLD", "REJECTED", "LOST", "WRITTEN_OFF"].includes(unit.stock_status);
  const modelTitle = `${refs.brands.get(unit.brand_id) ?? "-"} ${refs.models.get(unit.model_id) ?? ""}`.trim();

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/inventory">
          <Button icon={<ArrowLeft size={16} />} variant="secondary">
            Kembali
          </Button>
        </Link>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={() => setReloadKey((value) => value + 1)}
          variant="secondary"
        >
          Refresh
        </Button>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="rounded-md border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-950">{unit.stock_code}</h2>
              <StatusBadge status={unit.stock_status} />
            </div>
            <p className="mt-2 text-sm text-stone-600">{modelTitle}</p>
            <p className="mt-1 text-xs text-stone-500">IMEI: {unit.imei_1}</p>
          </div>
          {unit.photo_drive_url ? (
            <a
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-900 underline underline-offset-4"
              href={unit.photo_drive_url}
              rel="noreferrer"
              target="_blank"
            >
              Buka foto unit
              <ExternalLink size={14} />
            </a>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Total Modal" value={formatRupiah(estimates.cost)} />
          <Metric label="Harga Pasang" value={formatRupiah(estimates.listing)} />
          <Metric label="Harga Minimal" value={formatRupiah(estimates.minimum)} />
          <Metric label="Laba Harga Pasang" value={formatRupiah(estimates.listingProfit)} />
          <Metric label="Laba Harga Minimal" value={formatRupiah(estimates.minimumProfit)} />
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Storage" value={unit.storage_variant_id ? refs.storage.get(unit.storage_variant_id) ?? "-" : "-"} />
          <Info label="Warna" value={unit.color_id ? refs.colors.get(unit.color_id) ?? "-" : "-"} />
          <Info label="Kondisi" value={unit.physical_condition_id ? refs.physical.get(unit.physical_condition_id) ?? "-" : "-"} />
          <Info label="SIM" value={unit.sim_type ?? "-"} />
          <Info label="IMEI 2" value={unit.imei_2 ?? "-"} />
          <Info label="Serial" value={unit.serial_number ?? "-"} />
          <Info label="Battery" value={unit.battery_health ? `${unit.battery_health}%` : "-"} />
          <Info label="Cycle" value={unit.cycle_count ?? "-"} />
          <Info label="iCloud" value={unit.icloud_status ?? "-"} />
          <Info label="Google Account" value={unit.google_account_status ?? "-"} />
          <Info label="Find My" value={unit.find_my_status ?? "-"} />
          <Info label="IMEI Status" value={unit.imei_status ?? "-"} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={submitCost}>
          <div>
            <p className="text-sm font-medium uppercase text-stone-500">Biaya Unit</p>
            <h3 className="text-lg font-semibold text-stone-950">Tambah Biaya</h3>
          </div>
          <SelectField
            disabled={blockedAction}
            label="Kategori Biaya"
            onChange={(event) =>
              setCostForm((current) => ({ ...current, cost_category_id: event.target.value }))
            }
            options={refs.costCategories.map((category) => ({
              label: category.name,
              value: category.id,
            }))}
            value={costForm.cost_category_id}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              disabled={blockedAction}
              label="Tanggal"
              onChange={(event) =>
                setCostForm((current) => ({ ...current, cost_date: event.target.value }))
              }
              required
              type="date"
              value={costForm.cost_date}
            />
            <TextInput
              disabled={blockedAction}
              label="Nominal"
              min="1"
              onChange={(event) =>
                setCostForm((current) => ({ ...current, amount: event.target.value }))
              }
              required
              type="number"
              value={costForm.amount}
            />
          </div>
          <TextInput
            disabled={blockedAction}
            label="Deskripsi"
            onChange={(event) =>
              setCostForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Servis, spare part, cleaning"
            required
            value={costForm.description}
          />
          <SelectField
            disabled={blockedAction}
            label="Akun Pembayaran"
            onChange={(event) =>
              setCostForm((current) => ({ ...current, payment_account_id: event.target.value }))
            }
            options={refs.accounts.map((account) => ({
              label: `${account.account_code} - ${account.account_name}`,
              value: account.id,
            }))}
            value={costForm.payment_account_id}
          />
          <TextInput
            disabled={blockedAction}
            label="URL Bukti"
            onChange={(event) =>
              setCostForm((current) => ({ ...current, proof_url: event.target.value }))
            }
            placeholder="https://drive.google.com/..."
            type="url"
            value={costForm.proof_url}
          />
          <TextAreaField
            disabled={blockedAction}
            label="Catatan"
            onChange={(event) =>
              setCostForm((current) => ({ ...current, notes: event.target.value }))
            }
            value={costForm.notes}
          />
          <Button disabled={blockedAction || savingCost} icon={<Plus size={16} />} type="submit">
            {savingCost ? "Menyimpan..." : "Tambah Biaya"}
          </Button>
        </form>

        <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={submitPrice}>
          <div>
            <p className="text-sm font-medium uppercase text-stone-500">Harga Jual</p>
            <h3 className="text-lg font-semibold text-stone-950">Update Harga</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              disabled={blockedAction}
              label="Harga Pasang"
              min="1"
              onChange={(event) =>
                setPriceForm((current) => ({ ...current, listing_price: event.target.value }))
              }
              required
              type="number"
              value={priceForm.listing_price}
            />
            <TextInput
              disabled={blockedAction}
              label="Harga Minimal"
              min="1"
              onChange={(event) =>
                setPriceForm((current) => ({ ...current, minimum_price: event.target.value }))
              }
              required
              type="number"
              value={priceForm.minimum_price}
            />
          </div>
          <div className="grid gap-3 rounded-md bg-stone-50 p-3 text-sm sm:grid-cols-2">
            <Info
              label="Estimasi laba pasang"
              value={formatRupiah(Number(priceForm.listing_price || 0) - unit.total_unit_cost)}
            />
            <Info
              label="Estimasi laba minimal"
              value={formatRupiah(Number(priceForm.minimum_price || 0) - unit.total_unit_cost)}
            />
          </div>
          <TextInput
            disabled={blockedAction}
            label="Alasan"
            onChange={(event) =>
              setPriceForm((current) => ({ ...current, reason: event.target.value }))
            }
            placeholder="Harga awal, penyesuaian pasar, promo"
            value={priceForm.reason}
          />
          <TextAreaField
            disabled={blockedAction}
            label="Catatan"
            onChange={(event) =>
              setPriceForm((current) => ({ ...current, notes: event.target.value }))
            }
            value={priceForm.notes}
          />
          <Button disabled={blockedAction || savingPrice} icon={<Save size={16} />} type="submit">
            {savingPrice ? "Menyimpan..." : "Update Harga"}
          </Button>
        </form>
      </section>

      <section className="grid gap-4">
        <h3 className="text-lg font-semibold text-stone-950">Riwayat Biaya</h3>
        <DataTable
          columns={[
            { key: "date", header: "Tanggal", render: (row) => formatDate(row.cost_date) },
            { key: "number", header: "Nomor", render: (row) => row.cost_number },
            {
              key: "category",
              header: "Kategori",
              render: (row) => refs.categoryNames.get(row.cost_category_id) ?? row.cost_category_id,
            },
            { key: "description", header: "Deskripsi", render: (row) => row.description },
            {
              key: "account",
              header: "Akun Bayar",
              render: (row) =>
                row.payment_account_id ? refs.accountNames.get(row.payment_account_id) ?? "-" : "-",
            },
            { key: "amount", header: "Nominal", align: "right", render: (row) => formatRupiah(row.amount) },
          ]}
          emptyLabel="Belum ada biaya tambahan."
          getRowKey={(row) => row.id}
          rows={detail.costs}
        />
      </section>

      <section className="grid gap-4">
        <h3 className="text-lg font-semibold text-stone-950">Riwayat Harga</h3>
        <DataTable
          columns={[
            { key: "date", header: "Tanggal", render: (row) => formatDateTime(row.effective_at) },
            { key: "listing", header: "Harga Pasang", align: "right", render: (row) => formatRupiah(row.listing_price) },
            { key: "minimum", header: "Harga Minimal", align: "right", render: (row) => formatRupiah(row.minimum_price) },
            { key: "profit_listing", header: "Laba Pasang", align: "right", render: (row) => formatRupiah(row.estimated_profit_at_listing) },
            { key: "profit_minimum", header: "Laba Minimal", align: "right", render: (row) => formatRupiah(row.estimated_profit_at_minimum) },
            { key: "reason", header: "Alasan", render: (row) => row.reason ?? "-" },
          ]}
          emptyLabel="Belum ada riwayat harga."
          getRowKey={(row) => row.id}
          rows={detail.price_histories}
        />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <div className="mt-1 font-medium text-stone-900">{value}</div>
    </div>
  );
}

function optional(value: string) {
  return value.trim() || null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
