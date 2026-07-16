"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { fetchApi } from "@/lib/api/client";
import type {
  AccessoryTypeOption,
  BankAccountOption,
  BrandOption,
  ColorOption,
  ModelOption,
  PhysicalConditionOption,
  ReceiptReferences,
  SellerOption,
  StorageOption,
} from "@/lib/receipts/receipt-ui-types";

type CreateReceiptResult = {
  receipt: {
    id: string;
  };
};

const simOptions = [
  { label: "Ikuti default model", value: "" },
  { label: "Single SIM", value: "SINGLE" },
  { label: "Dual SIM", value: "DUAL" },
  { label: "eSIM", value: "ESIM" },
  { label: "Hybrid", value: "HYBRID" },
];

const receiptStatusOptions = [
  { label: "Draft", value: "DRAFT" },
  { label: "Langsung inspeksi", value: "INSPECTION" },
];

const securityStatusOptions = [
  { label: "Belum dicek", value: "" },
  { label: "OK / aman", value: "OK" },
  { label: "Clean", value: "CLEAN" },
  { label: "Active", value: "ACTIVE" },
  { label: "Locked", value: "LOCKED" },
  { label: "Issue", value: "ISSUE" },
];

const photoUrlTypeOptions = [
  { label: "Folder", value: "FOLDER" },
  { label: "Album", value: "ALBUM" },
  { label: "Foto", value: "PHOTO" },
];

export function ReceiptCreateForm() {
  const router = useRouter();
  const [references, setReferences] = useState<ReceiptReferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    receipt_date: new Date().toISOString().slice(0, 10),
    seller_id: "",
    status: "DRAFT",
    purchase_account_id: "",
    purchase_payment_reference: "",
    purchase_payment_proof_url: "",
    photo_drive_url: "",
    photo_drive_url_type: "FOLDER",
    notes: "",
    brand_id: "",
    model_id: "",
    storage_variant_id: "",
    color_id: "",
    physical_condition_id: "",
    imei_1: "",
    imei_2: "",
    serial_number: "",
    sim_type: "",
    battery_health: "",
    cycle_count: "",
    icloud_status: "",
    google_account_status: "",
    find_my_status: "",
    imei_status: "OK",
    mdm_status: "",
    purchase_price: "",
    purchase_transfer_fee: "0",
    current_listing_price: "",
    minimum_price: "",
    minus_notes: "",
    internal_notes: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadReferences() {
      setLoading(true);
      setError("");

      try {
        const [
          sellers,
          brands,
          models,
          storageVariants,
          colors,
          physicalConditions,
          accessoryTypes,
          inspectionItems,
          bankAccounts,
        ] = await Promise.all([
          fetchApi<SellerOption[]>("/api/sellers", { signal: controller.signal }),
          fetchApi<BrandOption[]>("/api/brands", { signal: controller.signal }),
          fetchApi<ModelOption[]>("/api/models", { signal: controller.signal }),
          fetchApi<StorageOption[]>("/api/storage-variants", { signal: controller.signal }),
          fetchApi<ColorOption[]>("/api/colors", { signal: controller.signal }),
          fetchApi<PhysicalConditionOption[]>("/api/physical-conditions", {
            signal: controller.signal,
          }),
          fetchApi<AccessoryTypeOption[]>("/api/accessory-types", { signal: controller.signal }),
          fetchApi<ReceiptReferences["inspectionItems"]>("/api/inspection-items", {
            signal: controller.signal,
          }),
          fetchApi<BankAccountOption[]>("/api/bank-accounts", { signal: controller.signal }),
        ]);

        setReferences({
          sellers,
          brands,
          models,
          storageVariants,
          colors,
          physicalConditions,
          accessoryTypes,
          inspectionItems,
          bankAccounts,
        });

        setForm((current) => {
          const brandId = current.brand_id || brands[0]?.id || "";
          const modelId =
            current.model_id && models.some((model) => model.id === current.model_id)
              ? current.model_id
              : models.find((model) => model.brand_id === brandId)?.id || "";

          return {
            ...current,
            seller_id: current.seller_id || sellers[0]?.id || "",
            brand_id: brandId,
            model_id: modelId,
            purchase_account_id:
              current.purchase_account_id ||
              bankAccounts.find((account) => account.is_default_purchase)?.account_id ||
              bankAccounts[0]?.account_id ||
              "",
          };
        });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Referensi gagal dimuat.");
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

  const filteredModels = useMemo(
    () => references?.models.filter((model) => model.brand_id === form.brand_id) ?? [],
    [form.brand_id, references],
  );
  const filteredColors = useMemo(
    () =>
      references?.colors.filter(
        (color) => !color.brand_id || color.brand_id === form.brand_id,
      ) ?? [],
    [form.brand_id, references],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const purchasePrice = toNumber(form.purchase_price);
      const transferFee = toNumber(form.purchase_transfer_fee);
      const totalCost = purchasePrice + transferFee;

      const payload = {
        receipt_date: form.receipt_date,
        seller_id: form.seller_id,
        status: form.status,
        purchase_account_id: optional(form.purchase_account_id),
        purchase_payment_reference: optional(form.purchase_payment_reference),
        purchase_payment_proof_url: optional(form.purchase_payment_proof_url),
        photo_drive_url: optional(form.photo_drive_url),
        photo_drive_url_type: form.photo_drive_url_type,
        notes: optional(form.notes),
        unit: {
          brand_id: form.brand_id,
          model_id: form.model_id,
          storage_variant_id: optional(form.storage_variant_id),
          color_id: optional(form.color_id),
          physical_condition_id: optional(form.physical_condition_id),
          imei_1: form.imei_1,
          imei_2: optional(form.imei_2),
          serial_number: optional(form.serial_number),
          sim_type: optional(form.sim_type),
          battery_health: toOptionalNumber(form.battery_health),
          cycle_count: toOptionalNumber(form.cycle_count),
          icloud_status: optional(form.icloud_status),
          google_account_status: optional(form.google_account_status),
          find_my_status: optional(form.find_my_status),
          imei_status: optional(form.imei_status),
          mdm_status: optional(form.mdm_status),
          purchase_price: purchasePrice,
          purchase_transfer_fee: transferFee,
          total_unit_cost: totalCost,
          current_listing_price: toOptionalNumber(form.current_listing_price),
          minimum_price: toOptionalNumber(form.minimum_price),
          minus_notes: optional(form.minus_notes),
          internal_notes: optional(form.internal_notes),
          photo_drive_url: optional(form.photo_drive_url),
          accessories: Array.from(selectedAccessories).map((accessoryTypeId) => ({
            accessory_type_id: accessoryTypeId,
            is_included: true,
          })),
        },
      };

      const result = await fetchApi<CreateReceiptResult>("/api/receipts", {
        body: JSON.stringify(payload),
        method: "POST",
      });

      router.push(`/receipts/${result.receipt.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Receipt gagal disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  function update(name: keyof typeof form, value: string) {
    if (name === "brand_id") {
      const firstModelId =
        references?.models.find((model) => model.brand_id === value)?.id ?? "";

      setForm((current) => ({
        ...current,
        brand_id: value,
        color_id: "",
        model_id: firstModelId,
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleAccessory(id: string) {
    setSelectedAccessories((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (loading) {
    return <LoadingState label="Memuat referensi penerimaan" />;
  }

  if (!references) {
    return <ErrorState message={error || "Referensi belum tersedia."} />;
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <div className="flex items-center justify-between gap-3">
        <Link href="/receipts">
          <Button icon={<ArrowLeft size={16} />} variant="secondary">
            Kembali
          </Button>
        </Link>
        <Button disabled={submitting} icon={<Save size={16} />} type="submit">
          {submitting ? "Menyimpan..." : "Simpan Receipt"}
        </Button>
      </div>

      {error ? <ErrorState message={error} title="Gagal menyimpan" /> : null}

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <SelectField
          label="Seller"
          onChange={(event) => update("seller_id", event.target.value)}
          options={references.sellers.map((seller) => ({
            label: `${seller.name}${seller.phone ? ` - ${seller.phone}` : ""}`,
            value: seller.id,
          }))}
          placeholder="Pilih seller"
          required
          value={form.seller_id}
        />
        <TextInput
          label="Tanggal Terima"
          onChange={(event) => update("receipt_date", event.target.value)}
          required
          type="date"
          value={form.receipt_date}
        />
        <SelectField
          label="Status Awal"
          onChange={(event) => update("status", event.target.value)}
          options={receiptStatusOptions}
          value={form.status}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <SelectField
          label="Brand"
          onChange={(event) => update("brand_id", event.target.value)}
          options={references.brands.map((brand) => ({ label: brand.name, value: brand.id }))}
          required
          value={form.brand_id}
        />
        <SelectField
          label="Model"
          onChange={(event) => update("model_id", event.target.value)}
          options={filteredModels.map((model) => ({
            label: model.model_name,
            value: model.id,
          }))}
          placeholder="Pilih model"
          required
          value={form.model_id}
        />
        <SelectField
          label="Storage"
          onChange={(event) => update("storage_variant_id", event.target.value)}
          options={references.storageVariants.map((storage) => ({
            label: storage.label,
            value: storage.id,
          }))}
          placeholder="Pilih storage"
          value={form.storage_variant_id}
        />
        <SelectField
          label="Warna"
          onChange={(event) => update("color_id", event.target.value)}
          options={filteredColors.map((color) => ({ label: color.name, value: color.id }))}
          placeholder="Pilih warna"
          value={form.color_id}
        />
        <SelectField
          label="Kondisi Fisik"
          onChange={(event) => update("physical_condition_id", event.target.value)}
          options={references.physicalConditions.map((condition) => ({
            label: condition.name,
            value: condition.id,
          }))}
          placeholder="Pilih kondisi"
          value={form.physical_condition_id}
        />
        <SelectField
          label="SIM"
          onChange={(event) => update("sim_type", event.target.value)}
          options={simOptions}
          value={form.sim_type}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <TextInput
          label="IMEI 1"
          onChange={(event) => update("imei_1", event.target.value)}
          placeholder="14-17 digit"
          required
          value={form.imei_1}
        />
        <TextInput
          label="IMEI 2"
          onChange={(event) => update("imei_2", event.target.value)}
          placeholder="Opsional"
          value={form.imei_2}
        />
        <TextInput
          label="Serial Number"
          onChange={(event) => update("serial_number", event.target.value)}
          value={form.serial_number}
        />
        <SelectField
          label="IMEI Status"
          onChange={(event) => update("imei_status", event.target.value)}
          options={securityStatusOptions}
          value={form.imei_status}
        />
        <SelectField
          label="iCloud Status"
          onChange={(event) => update("icloud_status", event.target.value)}
          options={securityStatusOptions}
          value={form.icloud_status}
        />
        <SelectField
          label="Google Account Status"
          onChange={(event) => update("google_account_status", event.target.value)}
          options={securityStatusOptions}
          value={form.google_account_status}
        />
        <SelectField
          label="Find My Status"
          onChange={(event) => update("find_my_status", event.target.value)}
          options={securityStatusOptions}
          value={form.find_my_status}
        />
        <SelectField
          label="MDM Status"
          onChange={(event) => update("mdm_status", event.target.value)}
          options={securityStatusOptions}
          value={form.mdm_status}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-3">
        <TextInput
          label="Harga Beli"
          min="0"
          onChange={(event) => update("purchase_price", event.target.value)}
          required
          type="number"
          value={form.purchase_price}
        />
        <TextInput
          label="Biaya Transfer"
          min="0"
          onChange={(event) => update("purchase_transfer_fee", event.target.value)}
          type="number"
          value={form.purchase_transfer_fee}
        />
        <SelectField
          label="Akun Pembayaran"
          onChange={(event) => update("purchase_account_id", event.target.value)}
          options={references.bankAccounts.map((account) => ({
            label: `${account.bank_name} - ${account.account_holder}`,
            value: account.account_id,
          }))}
          placeholder="Pilih akun kas/bank"
          value={form.purchase_account_id}
        />
        <TextInput
          label="Referensi Pembayaran"
          onChange={(event) => update("purchase_payment_reference", event.target.value)}
          placeholder="No transfer / catatan bayar"
          value={form.purchase_payment_reference}
        />
        <TextInput
          label="URL Bukti Pembayaran"
          onChange={(event) => update("purchase_payment_proof_url", event.target.value)}
          placeholder="https://drive.google.com/..."
          type="url"
          value={form.purchase_payment_proof_url}
        />
        <TextInput
          label="URL Foto Unit"
          onChange={(event) => update("photo_drive_url", event.target.value)}
          placeholder="https://drive.google.com/..."
          type="url"
          value={form.photo_drive_url}
        />
        <SelectField
          label="Tipe URL Foto"
          onChange={(event) => update("photo_drive_url_type", event.target.value)}
          options={photoUrlTypeOptions}
          value={form.photo_drive_url_type}
        />
        <TextInput
          label="Battery Health"
          max="100"
          min="0"
          onChange={(event) => update("battery_health", event.target.value)}
          type="number"
          value={form.battery_health}
        />
        <TextInput
          label="Cycle Count"
          min="0"
          onChange={(event) => update("cycle_count", event.target.value)}
          type="number"
          value={form.cycle_count}
        />
      </section>

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-2">
        <TextAreaField
          label="Minus Notes"
          onChange={(event) => update("minus_notes", event.target.value)}
          value={form.minus_notes}
        />
        <TextAreaField
          label="Catatan Internal"
          onChange={(event) => update("internal_notes", event.target.value)}
          value={form.internal_notes}
        />
        <TextAreaField
          className="lg:col-span-2"
          label="Catatan Receipt"
          onChange={(event) => update("notes", event.target.value)}
          value={form.notes}
        />
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-4">
        <p className="text-sm font-semibold text-stone-900">Aksesori Termasuk</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {references.accessoryTypes.map((accessory) => (
            <label
              className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700"
              key={accessory.id}
            >
              <input
                checked={selectedAccessories.has(accessory.id)}
                className="size-4"
                onChange={() => toggleAccessory(accessory.id)}
                type="checkbox"
              />
              {accessory.name}
            </label>
          ))}
        </div>
      </section>
    </form>
  );
}

function optional(value: string) {
  return value.trim() || null;
}

function toNumber(value: string) {
  return Number(value || 0);
}

function toOptionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}
