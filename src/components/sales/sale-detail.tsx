"use client";

import { ArrowLeft, CheckCircle2, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type { AccountOption, CostCategoryOption } from "@/lib/inventory/inventory-ui-types";
import type { BrandOption, ModelOption } from "@/lib/receipts/receipt-ui-types";
import type {
  CustomerOption,
  SaleDetail as SaleDetailData,
  SalesChannelOption,
} from "@/lib/sales-ui/sales-ui-types";

type SaleDetailProps = {
  id: string;
};

type References = {
  customers: Map<string, string>;
  channels: Map<string, string>;
  accounts: AccountOption[];
  accountNames: Map<string, string>;
  costCategoryNames: Map<string, string>;
  brandNames: Map<string, string>;
  modelNames: Map<string, string>;
};

const paymentMethodOptions = [
  { label: "Cash", value: "CASH" },
  { label: "Transfer", value: "TRANSFER" },
  { label: "Marketplace", value: "MARKETPLACE" },
  { label: "Lainnya", value: "OTHER" },
];

const returnTargetOptions = [
  { label: "Kembali ke stok", value: "IN_STOCK" },
  { label: "Masuk service", value: "SERVICE" },
  { label: "Rusak / damaged", value: "DAMAGED" },
];

export function SaleDetail({ id }: SaleDetailProps) {
  const [detail, setDetail] = useState<SaleDetailData | null>(null);
  const [refs, setRefs] = useState<References | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savingComplete, setSavingComplete] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    payment_account_id: "",
    payment_method: "TRANSFER",
    payment_reference: "",
    payment_proof_url: "",
  });
  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().slice(0, 10),
    target_stock_status: "IN_STOCK",
    return_reason_code: "",
    return_notes: "",
    refund_amount: "",
    refund_account_id: "",
    refund_reference: "",
    refund_proof_url: "",
    notes: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          saleDetail,
          customers,
          channels,
          accounts,
          costCategories,
          brands,
          models,
        ] = await Promise.all([
          fetchApi<SaleDetailData>(`/api/sales/${id}`, { signal: controller.signal }),
          fetchApi<CustomerOption[]>("/api/customers", { signal: controller.signal }),
          fetchApi<SalesChannelOption[]>("/api/sales-channels", { signal: controller.signal }),
          fetchApi<AccountOption[]>("/api/accounts", { signal: controller.signal }),
          fetchApi<CostCategoryOption[]>("/api/cost-categories", { signal: controller.signal }),
          fetchApi<BrandOption[]>("/api/brands", { signal: controller.signal }),
          fetchApi<ModelOption[]>("/api/models", { signal: controller.signal }),
        ]);
        const cashAccounts = accounts.filter((account) => account.is_cash_account);
        const defaultAccount = saleDetail.sale.payment_account_id || cashAccounts[0]?.id || "";

        setDetail(saleDetail);
        setRefs({
          customers: new Map(customers.map((customer) => [customer.id, customer.name])),
          channels: new Map(channels.map((channel) => [channel.id, channel.name])),
          accounts: cashAccounts,
          accountNames: new Map(
            accounts.map((account) => [account.id, `${account.account_code} - ${account.account_name}`]),
          ),
          costCategoryNames: new Map(costCategories.map((category) => [category.id, category.name])),
          brandNames: new Map(brands.map((brand) => [brand.id, brand.name])),
          modelNames: new Map(models.map((model) => [model.id, model.model_name])),
        });
        setCompleteForm({
          payment_account_id: defaultAccount,
          payment_method: saleDetail.sale.payment_method ?? "TRANSFER",
          payment_reference: saleDetail.sale.payment_reference ?? "",
          payment_proof_url: saleDetail.sale.payment_proof_url ?? "",
        });
        setReturnForm((current) => ({
          ...current,
          refund_amount: current.refund_amount || String(saleDetail.sale.subtotal_amount || ""),
          refund_account_id: current.refund_account_id || defaultAccount,
        }));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Detail sale gagal dimuat.");
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

  const unitsById = useMemo(
    () => new Map((detail?.units ?? []).map((unit) => [unit.id, unit])),
    [detail],
  );
  const unitStatusesValid =
    detail?.units.every((unit) => unit.stock_status === "IN_STOCK" || unit.stock_status === "RESERVED") ??
    false;
  const canComplete = detail?.sale.status === "DRAFT" && unitStatusesValid;
  const canReturn =
    detail?.sale.status === "COMPLETED" &&
    detail.returns.length === 0 &&
    detail.units.every((unit) => unit.stock_status === "SOLD");

  async function completeSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingComplete(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(`/api/sales/${id}/complete`, {
        body: JSON.stringify(completeForm),
        method: "POST",
      });
      setNotice("Sale berhasil di-complete.");
      setReloadKey((value) => value + 1);
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Sale gagal di-complete.");
    } finally {
      setSavingComplete(false);
    }
  }

  async function returnSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingReturn(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(`/api/sales/${id}/return`, {
        body: JSON.stringify({
          return_date: returnForm.return_date,
          target_stock_status: returnForm.target_stock_status,
          return_reason_code: optional(returnForm.return_reason_code),
          return_notes: optional(returnForm.return_notes),
          refund_amount: Number(returnForm.refund_amount || 0),
          refund_account_id: optional(returnForm.refund_account_id),
          refund_reference: optional(returnForm.refund_reference),
          refund_proof_url: optional(returnForm.refund_proof_url),
          notes: optional(returnForm.notes),
        }),
        method: "POST",
      });
      setNotice("Retur penjualan berhasil diproses.");
      setReloadKey((value) => value + 1);
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : "Retur penjualan gagal diproses.");
    } finally {
      setSavingReturn(false);
    }
  }

  if (loading) {
    return <LoadingState label="Memuat detail sale" />;
  }

  if (!detail || !refs) {
    return <ErrorState message={error || "Detail sale belum tersedia."} />;
  }

  const sale = detail.sale;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/sales">
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
              <h2 className="text-2xl font-semibold text-stone-950">{sale.sale_number}</h2>
              <StatusBadge status={sale.status} />
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {formatDate(sale.sale_date)} ke {refs.customers.get(sale.customer_id) ?? sale.customer_id}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Channel: {sale.sales_channel_id ? refs.channels.get(sale.sales_channel_id) ?? "-" : "-"}
            </p>
          </div>
          <div className="grid gap-2 text-right text-sm">
            <p className="font-semibold text-stone-950">{formatRupiah(sale.total_profit_amount)}</p>
            <p className="text-stone-500">Estimasi laba sale</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Subtotal" value={formatRupiah(sale.subtotal_amount)} />
          <Metric label="Biaya Sales" value={formatRupiah(sale.total_sales_cost)} />
          <Metric label="Net Terjual" value={formatRupiah(sale.total_net_amount)} />
          <Metric label="HPP" value={formatRupiah(sale.total_cogs_amount)} />
          <Metric label="Laba" value={formatRupiah(sale.total_profit_amount)} />
        </div>
      </section>

      {!unitStatusesValid && sale.status === "DRAFT" ? (
        <ErrorState message="Sale draft ini memiliki unit yang tidak lagi berstatus IN_STOCK atau RESERVED. Complete sale dinonaktifkan." />
      ) : null}

      <section className="grid gap-4">
        <h3 className="text-lg font-semibold text-stone-950">Item Sale</h3>
        <DataTable
          columns={[
            {
              key: "unit",
              header: "Unit",
              render: (row) => {
                const unit = unitsById.get(row.phone_unit_id);
                return (
                  <div>
                    <p className="font-semibold text-stone-950">{unit?.stock_code ?? row.phone_unit_id}</p>
                    <p className="text-xs text-stone-500">
                      {unit ? `${refs.brandNames.get(unit.brand_id) ?? "-"} ${refs.modelNames.get(unit.model_id) ?? ""}` : "-"}
                    </p>
                  </div>
                );
              },
            },
            {
              key: "status",
              header: "Status Unit",
              render: (row) => {
                const unit = unitsById.get(row.phone_unit_id);
                return unit ? <StatusBadge status={unit.stock_status} /> : "-";
              },
            },
            { key: "final", header: "Final", align: "right", render: (row) => formatRupiah(row.final_price) },
            { key: "cost", header: "Modal", align: "right", render: (row) => formatRupiah(row.unit_cost) },
            { key: "net", header: "Net", align: "right", render: (row) => formatRupiah(row.net_amount) },
            { key: "profit", header: "Laba", align: "right", render: (row) => formatRupiah(row.profit_amount) },
          ]}
          emptyLabel="Belum ada item sale."
          getRowKey={(row) => row.id}
          rows={detail.items}
        />
      </section>

      <section className="grid gap-4">
        <h3 className="text-lg font-semibold text-stone-950">Biaya Penjualan</h3>
        <DataTable
          columns={[
            {
              key: "category",
              header: "Kategori",
              render: (row) => refs.costCategoryNames.get(row.cost_category_id) ?? row.cost_category_id,
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
          emptyLabel="Tidak ada biaya penjualan."
          getRowKey={(row) => row.id}
          rows={detail.costs}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={completeSale}>
          <div>
            <p className="text-sm font-medium uppercase text-stone-500">Complete Sale</p>
            <h3 className="text-lg font-semibold text-stone-950">Konfirmasi Pembayaran</h3>
          </div>
          <SelectField
            disabled={!canComplete}
            label="Akun Pembayaran"
            onChange={(event) =>
              setCompleteForm((current) => ({ ...current, payment_account_id: event.target.value }))
            }
            options={refs.accounts.map((account) => ({
              label: `${account.account_code} - ${account.account_name}`,
              value: account.id,
            }))}
            value={completeForm.payment_account_id}
          />
          <SelectField
            disabled={!canComplete}
            label="Metode Pembayaran"
            onChange={(event) =>
              setCompleteForm((current) => ({ ...current, payment_method: event.target.value }))
            }
            options={paymentMethodOptions}
            value={completeForm.payment_method}
          />
          <TextInput
            disabled={!canComplete}
            label="Referensi Pembayaran"
            onChange={(event) =>
              setCompleteForm((current) => ({ ...current, payment_reference: event.target.value }))
            }
            required={canComplete}
            value={completeForm.payment_reference}
          />
          <TextInput
            disabled={!canComplete}
            label="URL Bukti Pembayaran"
            onChange={(event) =>
              setCompleteForm((current) => ({ ...current, payment_proof_url: event.target.value }))
            }
            placeholder="https://drive.google.com/..."
            required={canComplete}
            type="url"
            value={completeForm.payment_proof_url}
          />
          <Button disabled={!canComplete || savingComplete} icon={<CheckCircle2 size={16} />} type="submit">
            {savingComplete ? "Memproses..." : "Complete Sale"}
          </Button>
        </form>

        <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={returnSale}>
          <div>
            <p className="text-sm font-medium uppercase text-stone-500">Retur Penjualan</p>
            <h3 className="text-lg font-semibold text-stone-950">Proses Retur</h3>
          </div>
          {detail.returns.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Sale ini sudah memiliki retur aktif.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              disabled={!canReturn}
              label="Tanggal Retur"
              onChange={(event) =>
                setReturnForm((current) => ({ ...current, return_date: event.target.value }))
              }
              required={canReturn}
              type="date"
              value={returnForm.return_date}
            />
            <SelectField
              disabled={!canReturn}
              label="Status Unit Setelah Retur"
              onChange={(event) =>
                setReturnForm((current) => ({ ...current, target_stock_status: event.target.value }))
              }
              options={returnTargetOptions}
              value={returnForm.target_stock_status}
            />
          </div>
          <TextInput
            disabled={!canReturn}
            label="Kode Alasan"
            onChange={(event) =>
              setReturnForm((current) => ({ ...current, return_reason_code: event.target.value }))
            }
            placeholder="BUYER_RETURN"
            value={returnForm.return_reason_code}
          />
          <TextAreaField
            disabled={!canReturn}
            label="Catatan Retur"
            onChange={(event) =>
              setReturnForm((current) => ({ ...current, return_notes: event.target.value }))
            }
            value={returnForm.return_notes}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              disabled={!canReturn}
              label="Nominal Refund"
              min="0"
              onChange={(event) =>
                setReturnForm((current) => ({ ...current, refund_amount: event.target.value }))
              }
              type="number"
              value={returnForm.refund_amount}
            />
            <SelectField
              disabled={!canReturn}
              label="Akun Refund"
              onChange={(event) =>
                setReturnForm((current) => ({ ...current, refund_account_id: event.target.value }))
              }
              options={refs.accounts.map((account) => ({
                label: `${account.account_code} - ${account.account_name}`,
                value: account.id,
              }))}
              value={returnForm.refund_account_id}
            />
          </div>
          <TextInput
            disabled={!canReturn}
            label="Referensi Refund"
            onChange={(event) =>
              setReturnForm((current) => ({ ...current, refund_reference: event.target.value }))
            }
            value={returnForm.refund_reference}
          />
          <TextInput
            disabled={!canReturn}
            label="URL Bukti Refund"
            onChange={(event) =>
              setReturnForm((current) => ({ ...current, refund_proof_url: event.target.value }))
            }
            placeholder="https://drive.google.com/..."
            type="url"
            value={returnForm.refund_proof_url}
          />
          <Button disabled={!canReturn || savingReturn} icon={<RotateCcw size={16} />} type="submit" variant="danger">
            {savingReturn ? "Memproses..." : "Proses Retur"}
          </Button>
        </form>
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
