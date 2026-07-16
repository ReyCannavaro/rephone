"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type { AccountOption, CostCategoryOption, InventoryUnit } from "@/lib/inventory/inventory-ui-types";
import type { BrandOption, ModelOption } from "@/lib/receipts/receipt-ui-types";
import type { CustomerOption, SalesChannelOption } from "@/lib/sales-ui/sales-ui-types";

type CreateSaleResult = {
  sale: {
    id: string;
  };
};

const paymentMethodOptions = [
  { label: "Belum dipilih", value: "" },
  { label: "Cash", value: "CASH" },
  { label: "Transfer", value: "TRANSFER" },
  { label: "Marketplace", value: "MARKETPLACE" },
  { label: "Lainnya", value: "OTHER" },
];

export function SaleCreateForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [channels, setChannels] = useState<SalesChannelOption[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [costCategories, setCostCategories] = useState<CostCategoryOption[]>([]);
  const [brandNames, setBrandNames] = useState<Map<string, string>>(new Map());
  const [modelNames, setModelNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    sale_date: new Date().toISOString().slice(0, 10),
    customer_id: "",
    sales_channel_id: "",
    phone_unit_id: "",
    final_price: "",
    payment_account_id: "",
    payment_method: "",
    payment_reference: "",
    payment_proof_url: "",
    notes: "",
    item_notes: "",
    cost_category_id: "",
    cost_description: "",
    cost_amount: "",
    cost_payment_account_id: "",
    cost_notes: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadReferences() {
      setLoading(true);
      setError("");

      try {
        const [
          customerData,
          channelData,
          stockUnits,
          reservedUnits,
          accountData,
          costCategoryData,
          brandData,
          modelData,
        ] = await Promise.all([
          fetchApi<CustomerOption[]>("/api/customers", { signal: controller.signal }),
          fetchApi<SalesChannelOption[]>("/api/sales-channels", { signal: controller.signal }),
          fetchApi<InventoryUnit[]>("/api/units?status=IN_STOCK&limit=200", {
            signal: controller.signal,
          }),
          fetchApi<InventoryUnit[]>("/api/units?status=RESERVED&limit=200", {
            signal: controller.signal,
          }),
          fetchApi<AccountOption[]>("/api/accounts", { signal: controller.signal }),
          fetchApi<CostCategoryOption[]>("/api/cost-categories", { signal: controller.signal }),
          fetchApi<BrandOption[]>("/api/brands", { signal: controller.signal }),
          fetchApi<ModelOption[]>("/api/models", { signal: controller.signal }),
        ]);

        const sellableUnits = [...stockUnits, ...reservedUnits];
        const cashAccounts = accountData.filter((account) => account.is_cash_account);
        const saleCostCategories = costCategoryData.filter((category) => category.scope === "SALES");
        const activeCustomers = customerData.filter((customer) => !customer.is_blocked);

        setCustomers(activeCustomers);
        setChannels(channelData);
        setUnits(sellableUnits);
        setAccounts(cashAccounts);
        setCostCategories(saleCostCategories);
        setBrandNames(new Map(brandData.map((brand) => [brand.id, brand.name])));
        setModelNames(new Map(modelData.map((model) => [model.id, model.model_name])));
        setForm((current) => {
          const unit = sellableUnits.find((item) => item.id === current.phone_unit_id) ?? sellableUnits[0];

          return {
            ...current,
            customer_id: current.customer_id || activeCustomers[0]?.id || "",
            sales_channel_id: current.sales_channel_id || channelData[0]?.id || "",
            phone_unit_id: current.phone_unit_id || unit?.id || "",
            final_price:
              current.final_price ||
              String(unit?.current_listing_price ?? unit?.minimum_price ?? ""),
            payment_account_id: current.payment_account_id || cashAccounts[0]?.id || "",
            cost_category_id: current.cost_category_id || saleCostCategories[0]?.id || "",
            cost_payment_account_id: current.cost_payment_account_id || cashAccounts[0]?.id || "",
          };
        });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Referensi sale gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReferences();

    return () => controller.abort();
  }, []);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === form.phone_unit_id) ?? null,
    [form.phone_unit_id, units],
  );
  const saleCostAmount = Number(form.cost_amount || 0);
  const finalPrice = Number(form.final_price || 0);
  const totalUnitCost = selectedUnit?.total_unit_cost ?? 0;
  const netAmount = finalPrice - saleCostAmount;
  const estimatedProfit = netAmount - totalUnitCost;
  const validUnitStatus =
    selectedUnit?.stock_status === "IN_STOCK" || selectedUnit?.stock_status === "RESERVED";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!selectedUnit || !validUnitStatus) {
        throw new Error("Pilih unit dengan status IN_STOCK atau RESERVED.");
      }

      const costs =
        form.cost_description.trim() && saleCostAmount > 0
          ? [
              {
                cost_category_id: form.cost_category_id,
                description: form.cost_description,
                amount: saleCostAmount,
                payment_account_id: optional(form.cost_payment_account_id),
                notes: optional(form.cost_notes),
              },
            ]
          : [];

      const result = await fetchApi<CreateSaleResult>("/api/sales", {
        body: JSON.stringify({
          sale_date: form.sale_date,
          customer_id: form.customer_id,
          sales_channel_id: optional(form.sales_channel_id),
          phone_unit_id: form.phone_unit_id,
          final_price: finalPrice,
          payment_account_id: optional(form.payment_account_id),
          payment_method: optional(form.payment_method),
          payment_reference: optional(form.payment_reference),
          payment_proof_url: optional(form.payment_proof_url),
          notes: optional(form.notes),
          item_notes: optional(form.item_notes),
          costs,
        }),
        method: "POST",
      });

      router.push(`/sales/${result.sale.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Draft sale gagal dibuat.");
    } finally {
      setSubmitting(false);
    }
  }

  function update(name: keyof typeof form, value: string) {
    if (name === "phone_unit_id") {
      const nextUnit = units.find((unit) => unit.id === value);
      setForm((current) => ({
        ...current,
        phone_unit_id: value,
        final_price: String(nextUnit?.current_listing_price ?? nextUnit?.minimum_price ?? ""),
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  if (loading) {
    return <LoadingState label="Memuat referensi penjualan" />;
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="flex items-center justify-between gap-3">
        <Link href="/sales">
          <Button icon={<ArrowLeft size={16} />} variant="secondary">
            Kembali
          </Button>
        </Link>
        <Button disabled={submitting || !validUnitStatus} icon={<Save size={16} />} type="submit">
          {submitting ? "Menyimpan..." : "Buat Draft Sale"}
        </Button>
      </div>

      {error ? <ErrorState message={error} title="Gagal membuat sale" /> : null}

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <TextInput
          label="Tanggal Sale"
          onChange={(event) => update("sale_date", event.target.value)}
          required
          type="date"
          value={form.sale_date}
        />
        <SelectField
          label="Customer"
          onChange={(event) => update("customer_id", event.target.value)}
          options={customers.map((customer) => ({
            label: `${customer.name}${customer.phone ? ` - ${customer.phone}` : ""}`,
            value: customer.id,
          }))}
          placeholder="Pilih customer"
          required
          value={form.customer_id}
        />
        <SelectField
          label="Channel"
          onChange={(event) => update("sales_channel_id", event.target.value)}
          options={channels.map((channel) => ({ label: channel.name, value: channel.id }))}
          placeholder="Pilih channel"
          value={form.sales_channel_id}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4">
        <SelectField
          label="Unit Dijual"
          onChange={(event) => update("phone_unit_id", event.target.value)}
          options={units.map((unit) => ({
            label: `${unit.stock_code} - ${modelNames.get(unit.model_id) ?? "Unit"} (${unit.stock_status})`,
            value: unit.id,
          }))}
          placeholder="Tidak ada unit sellable"
          required
          value={form.phone_unit_id}
        />
        {selectedUnit ? (
          <div className="grid gap-3 rounded-md bg-stone-50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <Info label="Status" value={<StatusBadge status={selectedUnit.stock_status} />} />
            <Info label="Brand" value={brandNames.get(selectedUnit.brand_id) ?? "-"} />
            <Info label="Model" value={modelNames.get(selectedUnit.model_id) ?? "-"} />
            <Info label="Modal" value={formatRupiah(selectedUnit.total_unit_cost)} />
            <Info label="Harga Minimal" value={formatRupiah(selectedUnit.minimum_price ?? 0)} />
          </div>
        ) : null}
        {!validUnitStatus ? (
          <ErrorState message="Unit harus berstatus IN_STOCK atau RESERVED sebelum bisa dijual." />
        ) : null}
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <TextInput
          label="Harga Final"
          min="1"
          onChange={(event) => update("final_price", event.target.value)}
          required
          type="number"
          value={form.final_price}
        />
        <SelectField
          label="Metode Pembayaran"
          onChange={(event) => update("payment_method", event.target.value)}
          options={paymentMethodOptions}
          value={form.payment_method}
        />
        <SelectField
          label="Akun Pembayaran"
          onChange={(event) => update("payment_account_id", event.target.value)}
          options={accounts.map((account) => ({
            label: `${account.account_code} - ${account.account_name}`,
            value: account.id,
          }))}
          placeholder="Pilih akun kas/bank"
          value={form.payment_account_id}
        />
        <TextInput
          label="Referensi Pembayaran"
          onChange={(event) => update("payment_reference", event.target.value)}
          value={form.payment_reference}
        />
        <TextInput
          label="URL Bukti Pembayaran"
          onChange={(event) => update("payment_proof_url", event.target.value)}
          placeholder="https://drive.google.com/..."
          type="url"
          value={form.payment_proof_url}
        />
        <TextAreaField
          label="Catatan Sale"
          onChange={(event) => update("notes", event.target.value)}
          value={form.notes}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <p className="text-sm font-semibold text-stone-950">Biaya Penjualan Opsional</p>
          <p className="mt-1 text-sm text-stone-500">
            Isi hanya jika ada biaya seperti admin marketplace, ongkir, packaging, atau COD.
          </p>
        </div>
        <SelectField
          label="Kategori Biaya"
          onChange={(event) => update("cost_category_id", event.target.value)}
          options={costCategories.map((category) => ({ label: category.name, value: category.id }))}
          value={form.cost_category_id}
        />
        <TextInput
          label="Deskripsi Biaya"
          onChange={(event) => update("cost_description", event.target.value)}
          placeholder="Admin marketplace"
          value={form.cost_description}
        />
        <TextInput
          label="Nominal Biaya"
          min="0"
          onChange={(event) => update("cost_amount", event.target.value)}
          type="number"
          value={form.cost_amount}
        />
        <SelectField
          label="Akun Bayar Biaya"
          onChange={(event) => update("cost_payment_account_id", event.target.value)}
          options={accounts.map((account) => ({
            label: `${account.account_code} - ${account.account_name}`,
            value: account.id,
          }))}
          value={form.cost_payment_account_id}
        />
        <TextAreaField
          className="lg:col-span-2"
          label="Catatan Item"
          onChange={(event) => update("item_notes", event.target.value)}
          value={form.item_notes}
        />
      </section>

      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Info label="Harga Final" value={formatRupiah(finalPrice)} />
        <Info label="Biaya Penjualan" value={formatRupiah(saleCostAmount)} />
        <Info label="Net Terjual" value={formatRupiah(netAmount)} />
        <Info label="Modal Unit" value={formatRupiah(totalUnitCost)} />
        <Info label="Estimasi Laba" value={formatRupiah(estimatedProfit)} />
      </section>
    </form>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
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
