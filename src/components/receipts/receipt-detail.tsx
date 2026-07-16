"use client";

import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type {
  AccessoryTypeOption,
  BankAccountOption,
  BrandOption,
  ColorOption,
  InspectionItemOption,
  ModelOption,
  PhysicalConditionOption,
  ReceiptDetail as ReceiptDetailData,
  SellerOption,
  StorageOption,
} from "@/lib/receipts/receipt-ui-types";

type ReceiptDetailProps = {
  id: string;
};

type DetailReferences = {
  sellers: SellerOption[];
  brands: BrandOption[];
  models: ModelOption[];
  storageVariants: StorageOption[];
  colors: ColorOption[];
  physicalConditions: PhysicalConditionOption[];
  accessoryTypes: AccessoryTypeOption[];
  inspectionItems: InspectionItemOption[];
  bankAccounts: BankAccountOption[];
};

type InspectionDraft = {
  result_status: string;
  boolean_value: string;
  number_value: string;
  text_value: string;
  notes: string;
};

const inspectionStatusOptions = [
  { label: "OK", value: "OK" },
  { label: "Minor", value: "MINOR" },
  { label: "Issue", value: "ISSUE" },
  { label: "Failed", value: "FAILED" },
  { label: "Unknown", value: "UNKNOWN" },
  { label: "N/A", value: "NOT_APPLICABLE" },
];

export function ReceiptDetail({ id }: ReceiptDetailProps) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<ReceiptDetailData | null>(null);
  const [references, setReferences] = useState<DetailReferences | null>(null);
  const [inspectionDrafts, setInspectionDrafts] = useState<Record<string, InspectionDraft>>({});
  const [acceptForm, setAcceptForm] = useState({
    purchase_account_id: "",
    purchase_payment_reference: "",
    purchase_payment_proof_url: "",
    photo_drive_url: "",
  });
  const [rejectForm, setRejectForm] = useState({
    rejection_reason_code: "",
    rejection_notes: "",
  });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingInspection, setSavingInspection] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          receiptDetail,
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
          fetchApi<ReceiptDetailData>(`/api/receipts/${id}`, { signal: controller.signal }),
          fetchApi<SellerOption[]>("/api/sellers", { signal: controller.signal }),
          fetchApi<BrandOption[]>("/api/brands", { signal: controller.signal }),
          fetchApi<ModelOption[]>("/api/models", { signal: controller.signal }),
          fetchApi<StorageOption[]>("/api/storage-variants", { signal: controller.signal }),
          fetchApi<ColorOption[]>("/api/colors", { signal: controller.signal }),
          fetchApi<PhysicalConditionOption[]>("/api/physical-conditions", {
            signal: controller.signal,
          }),
          fetchApi<AccessoryTypeOption[]>("/api/accessory-types", { signal: controller.signal }),
          fetchApi<InspectionItemOption[]>("/api/inspection-items", {
            signal: controller.signal,
          }),
          fetchApi<BankAccountOption[]>("/api/bank-accounts", { signal: controller.signal }),
        ]);

        const refs = {
          sellers,
          brands,
          models,
          storageVariants,
          colors,
          physicalConditions,
          accessoryTypes,
          inspectionItems,
          bankAccounts,
        };

        setDetail(receiptDetail);
        setReferences(refs);
        setAcceptForm({
          purchase_account_id:
            receiptDetail.receipt.purchase_account_id ||
            bankAccounts.find((account) => account.is_default_purchase)?.account_id ||
            bankAccounts[0]?.account_id ||
            "",
          purchase_payment_reference: receiptDetail.receipt.purchase_payment_reference ?? "",
          purchase_payment_proof_url: receiptDetail.receipt.purchase_payment_proof_url ?? "",
          photo_drive_url: receiptDetail.receipt.photo_drive_url ?? "",
        });
        setInspectionDrafts(buildInspectionDrafts(receiptDetail, refs.inspectionItems));
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
  }, [id, reloadKey]);

  const names = useMemo(() => {
    if (!references) {
      return null;
    }

    return {
      sellers: new Map(references.sellers.map((item) => [item.id, item.name])),
      brands: new Map(references.brands.map((item) => [item.id, item.name])),
      models: new Map(references.models.map((item) => [item.id, item.model_name])),
      storage: new Map(references.storageVariants.map((item) => [item.id, item.label])),
      colors: new Map(references.colors.map((item) => [item.id, item.name])),
      physical: new Map(references.physicalConditions.map((item) => [item.id, item.name])),
      accessories: new Map(references.accessoryTypes.map((item) => [item.id, item.name])),
    };
  }, [references]);

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!detail || !references) {
      return;
    }

    setSavingInspection(true);
    setError("");
    setNotice("");

    try {
      const results = detail.units.flatMap((unit) =>
        applicableInspectionItems(references.inspectionItems, unit.brand_id).map((item) => {
          const draft = inspectionDrafts[draftKey(unit.id, item.id)] ?? defaultInspectionDraft();
          return {
            phone_unit_id: unit.id,
            inspection_item_id: item.id,
            result_status: draft.result_status,
            boolean_value:
              item.input_type === "BOOLEAN" && draft.boolean_value
                ? draft.boolean_value === "true"
                : null,
            number_value:
              item.input_type === "NUMBER" && draft.number_value
                ? Number(draft.number_value)
                : null,
            text_value: item.input_type === "TEXT" ? optional(draft.text_value) : null,
            notes: optional(draft.notes),
          };
        }),
      );

      await fetchApi(`/api/receipts/${id}/inspection`, {
        body: JSON.stringify({ results }),
        method: "POST",
      });

      setNotice("Checklist inspeksi tersimpan.");
      showToast({ title: "Checklist tersimpan", message: "Hasil inspeksi unit sudah diperbarui." });
      setReloadKey((value) => value + 1);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Checklist gagal disimpan.";
      setError(message);
      showToast({ title: "Checklist gagal disimpan", message, variant: "error" });
    } finally {
      setSavingInspection(false);
    }
  }

  function requestAcceptReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAcceptConfirmOpen(true);
  }

  async function acceptReceipt() {
    setSavingAction(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(`/api/receipts/${id}/accept`, {
        body: JSON.stringify({
          purchase_account_id: acceptForm.purchase_account_id,
          purchase_payment_reference: acceptForm.purchase_payment_reference,
          purchase_payment_proof_url: acceptForm.purchase_payment_proof_url,
          photo_drive_url: acceptForm.photo_drive_url,
        }),
        method: "POST",
      });
      setAcceptConfirmOpen(false);
      setNotice("Receipt berhasil di-accept.");
      showToast({
        title: "Receipt di-accept",
        message: "Unit masuk stok dan jurnal pembelian sudah dibuat.",
      });
      setReloadKey((value) => value + 1);
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : "Receipt gagal di-accept.";
      setError(message);
      showToast({ title: "Receipt gagal di-accept", message, variant: "error" });
    } finally {
      setSavingAction(false);
    }
  }

  function requestRejectReceipt() {
    if (!rejectForm.rejection_notes.trim()) {
      const message = "Catatan reject wajib diisi.";
      setError(message);
      showToast({ title: "Reject belum bisa diproses", message, variant: "error" });
      return;
    }

    setRejectConfirmOpen(true);
  }

  async function rejectReceipt() {
    setSavingAction(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(`/api/receipts/${id}/reject`, {
        body: JSON.stringify(rejectForm),
        method: "POST",
      });
      setRejectConfirmOpen(false);
      setRejectOpen(false);
      setNotice("Receipt berhasil di-reject.");
      showToast({
        title: "Receipt di-reject",
        message: "Status receipt dan unit sudah diperbarui.",
      });
      setReloadKey((value) => value + 1);
    } catch (rejectError) {
      const message = rejectError instanceof Error ? rejectError.message : "Receipt gagal di-reject.";
      setError(message);
      showToast({ title: "Receipt gagal di-reject", message, variant: "error" });
    } finally {
      setSavingAction(false);
    }
  }

  function updateInspection(unitId: string, itemId: string, field: keyof InspectionDraft, value: string) {
    const key = draftKey(unitId, itemId);
    setInspectionDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? defaultInspectionDraft()),
        [field]: value,
      },
    }));
  }

  if (loading) {
    return <LoadingState label="Memuat detail receipt" />;
  }

  if (!detail || !references || !names) {
    return <ErrorState message={error || "Detail receipt belum tersedia."} />;
  }

  const locked = ["ACCEPTED", "REJECTED"].includes(detail.receipt.status);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/receipts">
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

      <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-stone-950">
              {detail.receipt.receipt_number}
            </h2>
            <StatusBadge status={detail.receipt.status} />
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {formatDate(detail.receipt.receipt_date)} dari{" "}
            {names.sellers.get(detail.receipt.seller_id) ?? detail.receipt.seller_id}
          </p>
          {detail.receipt.notes ? (
            <p className="mt-4 rounded-md bg-stone-50 p-3 text-sm text-stone-700">
              {detail.receipt.notes}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 text-sm">
          <SummaryLine label="Harga beli" value={formatRupiah(detail.receipt.total_purchase_amount)} />
          <SummaryLine label="Biaya langsung" value={formatRupiah(detail.receipt.total_direct_cost)} />
          <SummaryLine label="Total unit cost" value={formatRupiah(detail.receipt.total_unit_cost)} />
          <SummaryLine
            label="Bukti bayar"
            value={
              detail.receipt.purchase_payment_proof_url ? (
                <ExternalAnchor href={detail.receipt.purchase_payment_proof_url} label="Buka bukti" />
              ) : (
                "-"
              )
            }
          />
          <SummaryLine
            label="Foto unit"
            value={
              detail.receipt.photo_drive_url ? (
                <ExternalAnchor href={detail.receipt.photo_drive_url} label="Buka folder" />
              ) : (
                "-"
              )
            }
          />
        </div>
      </section>

      <section className="grid gap-4">
        {detail.units.map((unit) => (
          <article className="rounded-md border border-stone-200 bg-white p-5" key={unit.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-stone-950">{unit.stock_code}</h3>
                  <StatusBadge status={unit.stock_status} />
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  {names.brands.get(unit.brand_id) ?? "-"} {" / "}
                  {names.models.get(unit.model_id) ?? "-"} {" / "}
                  {unit.storage_variant_id ? names.storage.get(unit.storage_variant_id) : "-"} {" / "}
                  {unit.color_id ? names.colors.get(unit.color_id) : "-"}
                </p>
              </div>
              <p className="text-right text-sm font-semibold text-stone-950">
                {formatRupiah(unit.total_unit_cost)}
              </p>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryLine label="IMEI 1" value={unit.imei_1} />
              <SummaryLine label="IMEI 2" value={unit.imei_2 ?? "-"} />
              <SummaryLine label="Kondisi" value={unit.physical_condition_id ? names.physical.get(unit.physical_condition_id) ?? "-" : "-"} />
              <SummaryLine label="IMEI status" value={unit.imei_status ?? "-"} />
              <SummaryLine label="iCloud" value={unit.icloud_status ?? "-"} />
              <SummaryLine label="Google Account" value={unit.google_account_status ?? "-"} />
              <SummaryLine label="Battery" value={unit.battery_health ? `${unit.battery_health}%` : "-"} />
              <SummaryLine label="Cycle" value={unit.cycle_count ?? "-"} />
            </div>
            {unit.minus_notes || unit.internal_notes ? (
              <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
                {unit.minus_notes ? (
                  <p className="rounded-md bg-stone-50 p-3 text-stone-700">{unit.minus_notes}</p>
                ) : null}
                {unit.internal_notes ? (
                  <p className="rounded-md bg-stone-50 p-3 text-stone-700">{unit.internal_notes}</p>
                ) : null}
              </div>
            ) : null}
            <AccessoriesLine
              accessoryNames={names.accessories}
              accessories={detail.accessories.filter((item) => item.phone_unit_id === unit.id)}
            />
          </article>
        ))}
      </section>

      <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={saveInspection}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-stone-500">Checklist</p>
            <h3 className="text-lg font-semibold text-stone-950">Inspeksi Unit</h3>
          </div>
          <Button disabled={locked || savingInspection} icon={<SaveIcon />} type="submit">
            {savingInspection ? "Menyimpan..." : "Simpan Checklist"}
          </Button>
        </div>
        {detail.units.map((unit) => (
          <div className="grid gap-3 border-t border-stone-100 pt-4" key={unit.id}>
            <p className="text-sm font-semibold text-stone-900">{unit.stock_code}</p>
            <div className="grid gap-3">
              {applicableInspectionItems(references.inspectionItems, unit.brand_id).map((item) => {
                const draft = inspectionDrafts[draftKey(unit.id, item.id)] ?? defaultInspectionDraft();

                return (
                  <div
                    className="grid gap-3 rounded-md border border-stone-200 p-3 lg:grid-cols-[1.2fr_180px_1fr_1fr]"
                    key={item.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {item.name} {item.is_required ? <span className="text-red-600">*</span> : null}
                      </p>
                      <p className="text-xs text-stone-500">{item.category}</p>
                    </div>
                    <SelectField
                      label="Status"
                      onChange={(event) =>
                        updateInspection(unit.id, item.id, "result_status", event.target.value)
                      }
                      options={inspectionStatusOptions}
                      value={draft.result_status}
                    />
                    {renderInspectionValueInput(item, draft, (field, value) =>
                      updateInspection(unit.id, item.id, field, value),
                    )}
                    <TextInput
                      label="Catatan"
                      onChange={(event) =>
                        updateInspection(unit.id, item.id, "notes", event.target.value)
                      }
                      value={draft.notes}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </form>

      <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={requestAcceptReceipt}>
        <div>
          <p className="text-sm font-medium uppercase text-stone-500">Keputusan</p>
          <h3 className="text-lg font-semibold text-stone-950">Accept / Reject</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField
            disabled={locked}
            label="Akun Pembayaran"
            onChange={(event) =>
              setAcceptForm((current) => ({ ...current, purchase_account_id: event.target.value }))
            }
            options={references.bankAccounts.map((account) => ({
              label: `${account.bank_name} - ${account.account_holder}`,
              value: account.account_id,
            }))}
            value={acceptForm.purchase_account_id}
          />
          <TextInput
            disabled={locked}
            label="Referensi Pembayaran"
            onChange={(event) =>
              setAcceptForm((current) => ({
                ...current,
                purchase_payment_reference: event.target.value,
              }))
            }
            value={acceptForm.purchase_payment_reference}
          />
          <TextInput
            disabled={locked}
            label="URL Bukti Pembayaran"
            onChange={(event) =>
              setAcceptForm((current) => ({
                ...current,
                purchase_payment_proof_url: event.target.value,
              }))
            }
            type="url"
            value={acceptForm.purchase_payment_proof_url}
          />
          <TextInput
            disabled={locked}
            label="URL Foto Unit"
            onChange={(event) =>
              setAcceptForm((current) => ({ ...current, photo_drive_url: event.target.value }))
            }
            type="url"
            value={acceptForm.photo_drive_url}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={locked || savingAction}
            icon={<XCircle size={16} />}
            onClick={() => setRejectOpen(true)}
            type="button"
            variant="danger"
          >
            Reject
          </Button>
          <Button disabled={locked || savingAction} icon={<CheckCircle2 size={16} />} type="submit">
            {savingAction ? "Memproses..." : "Accept"}
          </Button>
        </div>
      </form>

      <Modal
        description="Receipt yang ditolak akan mengubah status unit menjadi REJECTED."
        footer={
          <>
            <Button onClick={() => setRejectOpen(false)} variant="secondary">
              Batal
            </Button>
            <Button disabled={savingAction} onClick={requestRejectReceipt} variant="danger">
              {savingAction ? "Memproses..." : "Reject Receipt"}
            </Button>
          </>
        }
        onClose={() => setRejectOpen(false)}
        open={rejectOpen}
        title="Reject Receipt"
      >
        <div className="grid gap-4">
          <TextInput
            label="Kode Alasan"
            onChange={(event) =>
              setRejectForm((current) => ({
                ...current,
                rejection_reason_code: event.target.value,
              }))
            }
            placeholder="FAILED_IMEI"
            value={rejectForm.rejection_reason_code}
          />
          <TextAreaField
            label="Catatan Reject"
            onChange={(event) =>
              setRejectForm((current) => ({ ...current, rejection_notes: event.target.value }))
            }
            required
            value={rejectForm.rejection_notes}
          />
        </div>
      </Modal>

      <ConfirmDialog
        confirmLabel="Accept Receipt"
        description="Aksi ini akan menerima receipt, memasukkan unit ke inventory, dan membuat jurnal pembelian. Pastikan checklist, pembayaran, dan folder foto sudah benar."
        loading={savingAction}
        onCancel={() => setAcceptConfirmOpen(false)}
        onConfirm={acceptReceipt}
        open={acceptConfirmOpen}
        title="Accept receipt ini?"
      />

      <ConfirmDialog
        confirmLabel="Reject Receipt"
        description="Aksi ini akan menolak receipt dan mengubah status unit menjadi REJECTED. Alasan dan catatan reject akan tersimpan di audit log."
        loading={savingAction}
        onCancel={() => setRejectConfirmOpen(false)}
        onConfirm={rejectReceipt}
        open={rejectConfirmOpen}
        title="Reject receipt ini?"
        variant="danger"
      />
    </div>
  );
}

function renderInspectionValueInput(
  item: InspectionItemOption,
  draft: InspectionDraft,
  update: (field: keyof InspectionDraft, value: string) => void,
) {
  if (item.input_type === "BOOLEAN") {
    return (
      <SelectField
        label="Nilai"
        onChange={(event) => update("boolean_value", event.target.value)}
        options={[
          { label: "Ya", value: "true" },
          { label: "Tidak", value: "false" },
        ]}
        value={draft.boolean_value}
      />
    );
  }

  if (item.input_type === "NUMBER") {
    return (
      <TextInput
        label={`Nilai${item.unit_label ? ` (${item.unit_label})` : ""}`}
        onChange={(event) => update("number_value", event.target.value)}
        type="number"
        value={draft.number_value}
      />
    );
  }

  if (item.input_type === "TEXT") {
    return (
      <TextInput
        label="Nilai"
        onChange={(event) => update("text_value", event.target.value)}
        value={draft.text_value}
      />
    );
  }

  return <div className="hidden lg:block" />;
}

function AccessoriesLine({
  accessories,
  accessoryNames,
}: {
  accessories: ReceiptDetailData["accessories"];
  accessoryNames: Map<string, string>;
}) {
  if (accessories.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {accessories.map((accessory) => (
        <span
          className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-700"
          key={accessory.id}
        >
          {accessoryNames.get(accessory.accessory_type_id) ?? accessory.accessory_type_id}
        </span>
      ))}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <div className="mt-1 font-medium text-stone-900">{value}</div>
    </div>
  );
}

function ExternalAnchor({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="inline-flex items-center gap-1 text-stone-900 underline underline-offset-4"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink size={13} />
    </a>
  );
}

function SaveIcon() {
  return <CheckCircle2 size={16} />;
}

function buildInspectionDrafts(detail: ReceiptDetailData, items: InspectionItemOption[]) {
  const drafts: Record<string, InspectionDraft> = {};

  detail.units.forEach((unit) => {
    applicableInspectionItems(items, unit.brand_id).forEach((item) => {
      const existing = detail.inspections.find(
        (inspection) =>
          inspection.phone_unit_id === unit.id && inspection.inspection_item_id === item.id,
      );

      drafts[draftKey(unit.id, item.id)] = {
        result_status: existing?.result_status ?? "OK",
        boolean_value:
          typeof existing?.boolean_value === "boolean" ? String(existing.boolean_value) : "true",
        number_value: existing?.number_value != null ? String(existing.number_value) : "",
        text_value: existing?.text_value ?? "",
        notes: existing?.notes ?? "",
      };
    });
  });

  return drafts;
}

function applicableInspectionItems(items: InspectionItemOption[], brandId: string) {
  return items.filter((item) => !item.applies_to_brand_id || item.applies_to_brand_id === brandId);
}

function defaultInspectionDraft(): InspectionDraft {
  return {
    result_status: "OK",
    boolean_value: "true",
    number_value: "",
    text_value: "",
    notes: "",
  };
}

function draftKey(unitId: string, itemId: string) {
  return `${unitId}:${itemId}`;
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
