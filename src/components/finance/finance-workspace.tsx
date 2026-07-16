"use client";

import { Save } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { useToast } from "@/components/ui/toast";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type {
  AccountBalance,
  AccountBalancesResponse,
  AccountOption,
  CostCategoryOption,
} from "@/lib/finance-ui/finance-ui-types";

type TabId = "capital" | "drawing" | "expense" | "adjustment";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "capital", label: "Setoran Modal" },
  { id: "drawing", label: "Prive" },
  { id: "expense", label: "Beban Operasional" },
  { id: "adjustment", label: "Penyesuaian Kas" },
];

const adjustmentTypeOptions = [
  { label: "Tambah saldo", value: "INCREASE" },
  { label: "Kurangi saldo", value: "DECREASE" },
];

export function FinanceWorkspace() {
  const { showToast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = useState<TabId>("capital");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [costCategories, setCostCategories] = useState<CostCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [capital, setCapital] = useState({
    contribution_date: today,
    account_id: "",
    amount: "",
    reference: "",
    proof_url: "",
    notes: "",
  });
  const [drawing, setDrawing] = useState({
    drawing_date: today,
    account_id: "",
    amount: "",
    reference: "",
    proof_url: "",
    notes: "",
  });
  const [expense, setExpense] = useState({
    expense_date: today,
    cost_category_id: "",
    expense_account_id: "",
    payment_account_id: "",
    description: "",
    amount: "",
    reference: "",
    proof_url: "",
    notes: "",
  });
  const [adjustment, setAdjustment] = useState({
    adjustment_date: today,
    account_id: "",
    adjustment_type: "INCREASE",
    amount: "",
    reason: "",
    offset_account_id: "",
    reference: "",
    proof_url: "",
    notes: "",
  });

  const cashAccounts = useMemo(
    () => accounts.filter((account) => account.is_cash_account),
    [accounts],
  );
  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.account_type === "EXPENSE"),
    [accounts],
  );
  const operatingCategories = useMemo(
    () => costCategories.filter((category) => category.scope === "OPERATING"),
    [costCategories],
  );
  const balanceByAccount = useMemo(
    () => new Map(balances.map((balance) => [balance.account_id, balance.balance])),
    [balances],
  );
  const accountOptions = cashAccounts.map((account) => ({
    label: `${account.account_code} - ${account.account_name}`,
    value: account.id,
  }));

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [accountData, categoryData, balanceData] = await Promise.all([
          fetchApi<AccountOption[]>("/api/accounts", { signal: controller.signal }),
          fetchApi<CostCategoryOption[]>("/api/cost-categories", { signal: controller.signal }),
          fetchApi<AccountBalancesResponse>("/api/ledger/balances?include_zero=true", {
            signal: controller.signal,
          }),
        ]);
        const nextCashAccounts = accountData.filter((account) => account.is_cash_account);
        const nextExpenseAccounts = accountData.filter(
          (account) => account.account_type === "EXPENSE",
        );
        const nextOperatingCategories = categoryData.filter(
          (category) => category.scope === "OPERATING",
        );

        setAccounts(accountData);
        setCostCategories(categoryData);
        setBalances(balanceData.accounts);
        setCapital((current) => ({
          ...current,
          account_id: current.account_id || nextCashAccounts[0]?.id || "",
        }));
        setDrawing((current) => ({
          ...current,
          account_id: current.account_id || nextCashAccounts[0]?.id || "",
        }));
        setExpense((current) => {
          const category = nextOperatingCategories[0];

          return {
            ...current,
            cost_category_id: current.cost_category_id || category?.id || "",
            expense_account_id:
              current.expense_account_id ||
              category?.expense_account_id ||
              nextExpenseAccounts[0]?.id ||
              "",
            payment_account_id: current.payment_account_id || nextCashAccounts[0]?.id || "",
          };
        });
        setAdjustment((current) => ({
          ...current,
          account_id: current.account_id || nextCashAccounts[0]?.id || "",
        }));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Data keuangan gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [reloadKey]);

  function getBalance(accountId: string) {
    return balanceByAccount.get(accountId) ?? 0;
  }

  async function submit(endpoint: string, payload: Record<string, unknown>, success: string) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await fetchApi(endpoint, {
        body: JSON.stringify(payload),
        method: "POST",
      });
      setNotice(success);
      showToast({
        title: "Transaksi tersimpan",
        message: success,
      });
      setReloadKey((value) => value + 1);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Transaksi gagal disimpan.";
      setError(message);
      showToast({ title: "Transaksi gagal disimpan", message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function submitCapital(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(
      "/api/capital-contributions",
      {
        ...capital,
        amount: Number(capital.amount),
        reference: optional(capital.reference),
        proof_url: optional(capital.proof_url),
        notes: optional(capital.notes),
      },
      "Setoran modal berhasil disimpan.",
    );
  }

  async function submitDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(
      "/api/owner-drawings",
      {
        ...drawing,
        amount: Number(drawing.amount),
        reference: optional(drawing.reference),
        proof_url: optional(drawing.proof_url),
        notes: optional(drawing.notes),
      },
      "Prive berhasil disimpan.",
    );
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(
      "/api/operating-expenses",
      {
        ...expense,
        amount: Number(expense.amount),
        reference: optional(expense.reference),
        proof_url: optional(expense.proof_url),
        notes: optional(expense.notes),
      },
      "Beban operasional berhasil disimpan.",
    );
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(
      "/api/cash-adjustments",
      {
        ...adjustment,
        amount: Number(adjustment.amount),
        offset_account_id: optional(adjustment.offset_account_id),
        reference: optional(adjustment.reference),
        proof_url: optional(adjustment.proof_url),
        notes: optional(adjustment.notes),
      },
      "Penyesuaian kas berhasil disimpan.",
    );
  }

  if (loading) {
    return <LoadingState label="Memuat data keuangan" />;
  }

  const currentBalance =
    activeTab === "capital"
      ? getBalance(capital.account_id)
      : activeTab === "drawing"
        ? getBalance(drawing.account_id)
        : activeTab === "expense"
          ? getBalance(expense.payment_account_id)
          : getBalance(adjustment.account_id);
  const currentAmount =
    activeTab === "capital"
      ? Number(capital.amount || 0)
      : activeTab === "drawing"
        ? Number(drawing.amount || 0)
        : activeTab === "expense"
          ? Number(expense.amount || 0)
          : Number(adjustment.amount || 0);
  const direction =
    activeTab === "capital" || (activeTab === "adjustment" && adjustment.adjustment_type === "INCREASE")
      ? 1
      : -1;
  const projectedBalance = currentBalance + currentAmount * direction;
  const outgoingWouldNegative = direction < 0 && projectedBalance < 0;

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Saldo rekening" value={formatRupiah(currentBalance)} />
        <Metric label="Nominal transaksi" value={formatRupiah(currentAmount)} />
        <Metric label="Saldo setelah submit" value={formatRupiah(projectedBalance)} tone={outgoingWouldNegative ? "danger" : "neutral"} />
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              className={[
                "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium transition",
                activeTab === tab.id
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200",
              ].join(" ")}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      ) : null}

      {activeTab === "capital" ? (
        <FinanceForm
          disabled={saving}
          onSubmit={submitCapital}
          submitLabel="Simpan Setoran Modal"
        >
          <TextInput
            label="Tanggal"
            onChange={(event) =>
              setCapital((current) => ({ ...current, contribution_date: event.target.value }))
            }
            required
            type="date"
            value={capital.contribution_date}
          />
          <CashAccountSelect
            accounts={accountOptions}
            label="Rekening Tujuan"
            onChange={(value) => setCapital((current) => ({ ...current, account_id: value }))}
            value={capital.account_id}
          />
          <MoneyInput
            label="Nominal"
            onChange={(value) => setCapital((current) => ({ ...current, amount: value }))}
            value={capital.amount}
          />
          <SharedFields
            onChange={(field, value) => setCapital((current) => ({ ...current, [field]: value }))}
            values={capital}
          />
        </FinanceForm>
      ) : null}

      {activeTab === "drawing" ? (
        <FinanceForm
          disabled={saving || outgoingWouldNegative}
          onSubmit={submitDrawing}
          submitLabel="Simpan Prive"
        >
          <TextInput
            label="Tanggal"
            onChange={(event) =>
              setDrawing((current) => ({ ...current, drawing_date: event.target.value }))
            }
            required
            type="date"
            value={drawing.drawing_date}
          />
          <CashAccountSelect
            accounts={accountOptions}
            label="Rekening Sumber"
            onChange={(value) => setDrawing((current) => ({ ...current, account_id: value }))}
            value={drawing.account_id}
          />
          <MoneyInput
            label="Nominal"
            onChange={(value) => setDrawing((current) => ({ ...current, amount: value }))}
            value={drawing.amount}
          />
          <SharedFields
            onChange={(field, value) => setDrawing((current) => ({ ...current, [field]: value }))}
            values={drawing}
          />
        </FinanceForm>
      ) : null}

      {activeTab === "expense" ? (
        <FinanceForm
          disabled={saving || outgoingWouldNegative}
          onSubmit={submitExpense}
          submitLabel="Simpan Beban Operasional"
        >
          <TextInput
            label="Tanggal"
            onChange={(event) =>
              setExpense((current) => ({ ...current, expense_date: event.target.value }))
            }
            required
            type="date"
            value={expense.expense_date}
          />
          <SelectField
            label="Kategori"
            onChange={(event) => {
              const category = operatingCategories.find((item) => item.id === event.target.value);
              setExpense((current) => ({
                ...current,
                cost_category_id: event.target.value,
                expense_account_id:
                  category?.expense_account_id || current.expense_account_id,
              }));
            }}
            options={operatingCategories.map((category) => ({
              label: category.name,
              value: category.id,
            }))}
            placeholder="Pilih kategori"
            value={expense.cost_category_id}
          />
          <SelectField
            label="Akun Beban"
            onChange={(event) =>
              setExpense((current) => ({ ...current, expense_account_id: event.target.value }))
            }
            options={expenseAccounts.map((account) => ({
              label: `${account.account_code} - ${account.account_name}`,
              value: account.id,
            }))}
            value={expense.expense_account_id}
          />
          <CashAccountSelect
            accounts={accountOptions}
            label="Rekening Bayar"
            onChange={(value) =>
              setExpense((current) => ({ ...current, payment_account_id: value }))
            }
            value={expense.payment_account_id}
          />
          <TextInput
            label="Deskripsi"
            onChange={(event) =>
              setExpense((current) => ({ ...current, description: event.target.value }))
            }
            required
            value={expense.description}
          />
          <MoneyInput
            label="Nominal"
            onChange={(value) => setExpense((current) => ({ ...current, amount: value }))}
            value={expense.amount}
          />
          <SharedFields
            onChange={(field, value) => setExpense((current) => ({ ...current, [field]: value }))}
            values={expense}
          />
        </FinanceForm>
      ) : null}

      {activeTab === "adjustment" ? (
        <FinanceForm
          disabled={saving || outgoingWouldNegative}
          onSubmit={submitAdjustment}
          submitLabel="Simpan Penyesuaian Kas"
        >
          <TextInput
            label="Tanggal"
            onChange={(event) =>
              setAdjustment((current) => ({ ...current, adjustment_date: event.target.value }))
            }
            required
            type="date"
            value={adjustment.adjustment_date}
          />
          <CashAccountSelect
            accounts={accountOptions}
            label="Rekening"
            onChange={(value) =>
              setAdjustment((current) => ({ ...current, account_id: value }))
            }
            value={adjustment.account_id}
          />
          <SelectField
            label="Tipe"
            onChange={(event) =>
              setAdjustment((current) => ({ ...current, adjustment_type: event.target.value }))
            }
            options={adjustmentTypeOptions}
            value={adjustment.adjustment_type}
          />
          <MoneyInput
            label="Nominal"
            onChange={(value) => setAdjustment((current) => ({ ...current, amount: value }))}
            value={adjustment.amount}
          />
          <SelectField
            label="Akun Lawan"
            onChange={(event) =>
              setAdjustment((current) => ({ ...current, offset_account_id: event.target.value }))
            }
            options={accounts
              .filter((account) => account.id !== adjustment.account_id)
              .map((account) => ({
                label: `${account.account_code} - ${account.account_name}`,
                value: account.id,
              }))}
            placeholder="Default otomatis"
            value={adjustment.offset_account_id}
          />
          <TextInput
            label="Alasan"
            onChange={(event) =>
              setAdjustment((current) => ({ ...current, reason: event.target.value }))
            }
            required
            value={adjustment.reason}
          />
          <SharedFields
            onChange={(field, value) =>
              setAdjustment((current) => ({ ...current, [field]: value }))
            }
            values={adjustment}
          />
        </FinanceForm>
      ) : null}

      {outgoingWouldNegative ? (
        <ErrorState message="Saldo rekening tidak cukup untuk transaksi keluar ini." />
      ) : null}
    </div>
  );
}

function FinanceForm({
  children,
  disabled,
  onSubmit,
  submitLabel,
}: {
  children: ReactNode;
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="grid gap-4 rounded-md border border-stone-200 bg-white p-5" onSubmit={onSubmit}>
      <div className="grid gap-4 lg:grid-cols-3">{children}</div>
      <div className="flex justify-end">
        <Button disabled={disabled} icon={<Save size={16} />} type="submit">
          {disabled ? "Tidak bisa submit" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CashAccountSelect({
  accounts,
  label,
  onChange,
  value,
}: {
  accounts: Array<{ label: string; value: string }>;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <SelectField
      label={label}
      onChange={(event) => onChange(event.target.value)}
      options={accounts}
      placeholder="Pilih rekening"
      required
      value={value}
    />
  );
}

function MoneyInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <TextInput
      label={label}
      min="1"
      onChange={(event) => onChange(event.target.value)}
      required
      type="number"
      value={value}
    />
  );
}

function SharedFields({
  onChange,
  values,
}: {
  onChange: (field: "reference" | "proof_url" | "notes", value: string) => void;
  values: {
    reference: string;
    proof_url: string;
    notes: string;
  };
}) {
  return (
    <>
      <TextInput
        label="Referensi"
        onChange={(event) => onChange("reference", event.target.value)}
        value={values.reference}
      />
      <TextInput
        label="URL Bukti"
        onChange={(event) => onChange("proof_url", event.target.value)}
        placeholder="https://drive.google.com/..."
        type="url"
        value={values.proof_url}
      />
      <TextAreaField
        className="lg:col-span-3"
        label="Catatan"
        onChange={(event) => onChange("notes", event.target.value)}
        value={values.notes}
      />
    </>
  );
}

function Metric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "danger";
  value: string;
}) {
  return (
    <div
      className={[
        "rounded-md border p-4",
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-stone-200 bg-white text-stone-950",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function optional(value: string) {
  return value.trim() || null;
}
