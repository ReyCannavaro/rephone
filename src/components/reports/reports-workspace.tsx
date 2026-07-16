"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SelectField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format/currency";
import type {
  BalanceSheetLine,
  BalanceSheetReport,
  BalancesResponse,
  CashFlowReport,
  DashboardReport,
  InventoryReport,
  LedgerResponse,
  ProfitLossReport,
  UnitProfitabilityReport,
} from "@/lib/reports-ui/reports-ui-types";

type TabId =
  | "ledger"
  | "balances"
  | "dashboard"
  | "inventory"
  | "unitProfitability"
  | "profitLoss"
  | "balanceSheet"
  | "cashFlow";

type ReportState = {
  ledger: LedgerResponse | null;
  balances: BalancesResponse | null;
  dashboard: DashboardReport | null;
  inventory: InventoryReport | null;
  unitProfitability: UnitProfitabilityReport | null;
  profitLoss: ProfitLossReport | null;
  balanceSheet: BalanceSheetReport | null;
  cashFlow: CashFlowReport | null;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "ledger", label: "Buku Besar" },
  { id: "balances", label: "Saldo Akun" },
  { id: "dashboard", label: "Dashboard" },
  { id: "inventory", label: "Inventory" },
  { id: "unitProfitability", label: "Profit Unit" },
  { id: "profitLoss", label: "Laba Rugi" },
  { id: "balanceSheet", label: "Neraca" },
  { id: "cashFlow", label: "Cash Flow" },
];

const accountTypeOptions = [
  { label: "Semua tipe", value: "" },
  { label: "Asset", value: "ASSET" },
  { label: "Liability", value: "LIABILITY" },
  { label: "Equity", value: "EQUITY" },
  { label: "Revenue", value: "REVENUE" },
  { label: "COGS", value: "COGS" },
  { label: "Expense", value: "EXPENSE" },
];

export function ReportsWorkspace() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = `${today.slice(0, 8)}01`;
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [accountType, setAccountType] = useState("");
  const [data, setData] = useState<ReportState>({
    ledger: null,
    balances: null,
    dashboard: null,
    inventory: null,
    unitProfitability: null,
    profitLoss: null,
    balanceSheet: null,
    cashFlow: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const periodQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) {
      params.set("date_from", dateFrom);
    }
    if (dateTo) {
      params.set("date_to", dateTo);
      params.set("as_of", dateTo);
    }
    return params.toString();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const ledgerParams = new URLSearchParams(periodQuery);
        const balanceParams = new URLSearchParams(periodQuery);

        if (accountType) {
          ledgerParams.set("account_type", accountType);
          balanceParams.set("account_type", accountType);
        }
        balanceParams.set("include_zero", "false");

        const [
          ledger,
          balances,
          dashboard,
          inventory,
          unitProfitability,
          profitLoss,
          balanceSheet,
          cashFlow,
        ] = await Promise.all([
          fetchApi<LedgerResponse>(`/api/ledger?${ledgerParams.toString()}`, {
            signal: controller.signal,
          }),
          fetchApi<BalancesResponse>(`/api/ledger/balances?${balanceParams.toString()}`, {
            signal: controller.signal,
          }),
          fetchApi<DashboardReport>(`/api/reports/dashboard?${periodQuery}`, {
            signal: controller.signal,
          }),
          fetchApi<InventoryReport>("/api/reports/inventory", { signal: controller.signal }),
          fetchApi<UnitProfitabilityReport>(`/api/reports/unit-profitability?${periodQuery}`, {
            signal: controller.signal,
          }),
          fetchApi<ProfitLossReport>(`/api/reports/profit-loss?${periodQuery}`, {
            signal: controller.signal,
          }),
          fetchApi<BalanceSheetReport>(`/api/reports/balance-sheet?${periodQuery}`, {
            signal: controller.signal,
          }),
          fetchApi<CashFlowReport>(`/api/reports/cash-flow?${periodQuery}`, {
            signal: controller.signal,
          }),
        ]);

        setData({
          ledger,
          balances,
          dashboard,
          inventory,
          unitProfitability,
          profitLoss,
          balanceSheet,
          cashFlow,
        });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Laporan gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => controller.abort();
  }, [accountType, periodQuery, reloadKey]);

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-[180px_180px_220px_auto]">
        <TextInput
          label="Dari"
          onChange={(event) => setDateFrom(event.target.value)}
          type="date"
          value={dateFrom}
        />
        <TextInput
          label="Sampai"
          onChange={(event) => setDateTo(event.target.value)}
          type="date"
          value={dateTo}
        />
        <SelectField
          label="Tipe Akun"
          onChange={(event) => setAccountType(event.target.value)}
          options={accountTypeOptions}
          value={accountType}
        />
        <div className="flex items-end">
          <Button
            icon={<RefreshCw size={16} />}
            onClick={() => setReloadKey((value) => value + 1)}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
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
      {loading ? (
        <LoadingState label="Memuat laporan" />
      ) : (
        <>
          {activeTab === "ledger" && data.ledger ? <LedgerTab data={data.ledger} /> : null}
          {activeTab === "balances" && data.balances ? <BalancesTab data={data.balances} /> : null}
          {activeTab === "dashboard" && data.dashboard ? <DashboardTab data={data.dashboard} /> : null}
          {activeTab === "inventory" && data.inventory ? <InventoryTab data={data.inventory} /> : null}
          {activeTab === "unitProfitability" && data.unitProfitability ? (
            <UnitProfitabilityTab data={data.unitProfitability} />
          ) : null}
          {activeTab === "profitLoss" && data.profitLoss ? <ProfitLossTab data={data.profitLoss} /> : null}
          {activeTab === "balanceSheet" && data.balanceSheet ? (
            <BalanceSheetTab data={data.balanceSheet} />
          ) : null}
          {activeTab === "cashFlow" && data.cashFlow ? <CashFlowTab data={data.cashFlow} /> : null}
        </>
      )}
    </div>
  );
}

function LedgerTab({ data }: { data: LedgerResponse }) {
  return (
    <DataTable
      columns={[
        { key: "date", header: "Tanggal", render: (row) => formatDate(row.transaction_date) },
        { key: "journal", header: "Jurnal", render: (row) => row.journal_number },
        { key: "source", header: "Source", render: (row) => <StatusBadge status={row.source_module} /> },
        { key: "account", header: "Akun", render: (row) => `${row.account_code} - ${row.account_name}` },
        { key: "debit", header: "Debit", align: "right", render: (row) => formatRupiah(row.debit) },
        { key: "credit", header: "Kredit", align: "right", render: (row) => formatRupiah(row.credit) },
        {
          key: "running",
          header: "Saldo Jalan",
          align: "right",
          render: (row) => formatRupiah(row.running_balance),
        },
      ]}
      emptyLabel="Belum ada baris buku besar."
      getRowKey={(row) => row.line_id}
      rows={data.lines}
    />
  );
}

function BalancesTab({ data }: { data: BalancesResponse }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <Metric label="Total Debit" value={formatRupiah(data.summary.total_debit)} />
        <Metric label="Total Kredit" value={formatRupiah(data.summary.total_credit)} />
      </section>
      <DataTable
        columns={[
          { key: "code", header: "Kode", render: (row) => row.account_code },
          { key: "name", header: "Akun", render: (row) => row.account_name },
          { key: "type", header: "Tipe", render: (row) => <StatusBadge status={row.account_type} /> },
          { key: "debit", header: "Debit", align: "right", render: (row) => formatRupiah(row.total_debit) },
          { key: "credit", header: "Kredit", align: "right", render: (row) => formatRupiah(row.total_credit) },
          { key: "balance", header: "Saldo", align: "right", render: (row) => formatRupiah(row.balance) },
        ]}
        emptyLabel="Tidak ada saldo akun untuk filter ini."
        getRowKey={(row) => row.account_id}
        rows={data.accounts}
      />
    </div>
  );
}

function DashboardTab({ data }: { data: DashboardReport }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Unit Inventory" value={String(data.cards.inventory_units)} />
      <Metric label="Nilai Inventory" value={formatRupiah(data.cards.inventory_value)} />
      <Metric label="Unit Terjual" value={String(data.cards.units_sold)} />
      <Metric label="Revenue" value={formatRupiah(data.cards.sales_revenue)} />
      <Metric label="Gross Profit" value={formatRupiah(data.cards.gross_profit)} />
      <Metric label="Net Profit" value={formatRupiah(data.cards.net_profit)} />
      <Metric label="Cash Balance" value={formatRupiah(data.cards.cash_balance)} />
      <Metric
        label="Neraca"
        tone={data.cards.balance_sheet_balanced ? "neutral" : "danger"}
        value={data.cards.balance_sheet_balanced ? "Seimbang" : "Tidak seimbang"}
      />
    </section>
  );
}

function InventoryTab({ data }: { data: InventoryReport }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Unit" value={String(data.summary.total_units)} />
        <Metric label="Unit Aktif" value={String(data.summary.active_inventory_units)} />
        <Metric label="Nilai Modal" value={formatRupiah(data.summary.total_inventory_value)} />
        <Metric label="Nilai Listing" value={formatRupiah(data.summary.total_listing_value)} />
      </section>
      <DataTable
        columns={[
          { key: "status", header: "Status", render: (row) => <StatusBadge status={row.stock_status} /> },
          { key: "count", header: "Unit", align: "right", render: (row) => row.unit_count },
          { key: "cost", header: "Modal", align: "right", render: (row) => formatRupiah(row.total_unit_cost) },
          { key: "listing", header: "Listing", align: "right", render: (row) => formatRupiah(row.total_listing_price) },
          { key: "min", header: "Minimal", align: "right", render: (row) => formatRupiah(row.total_minimum_price) },
        ]}
        emptyLabel="Tidak ada inventory."
        getRowKey={(row) => row.stock_status}
        rows={data.by_status}
      />
    </div>
  );
}

function UnitProfitabilityTab({ data }: { data: UnitProfitabilityReport }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Unit Terjual" value={String(data.summary.units_sold)} />
        <Metric label="Gross Sales" value={formatRupiah(data.summary.gross_sales)} />
        <Metric label="Sales Cost" value={formatRupiah(data.summary.sales_cost)} />
        <Metric label="Net Sales" value={formatRupiah(data.summary.net_sales)} />
        <Metric label="Modal Unit" value={formatRupiah(data.summary.total_unit_cost)} />
        <Metric label="Profit" value={formatRupiah(data.summary.total_profit)} />
      </section>
      <DataTable
        columns={[
          { key: "sale", header: "Sale", render: (row) => row.sale_number ?? "-" },
          { key: "unit", header: "Unit", render: (row) => row.stock_code ?? "-" },
          { key: "final", header: "Final", align: "right", render: (row) => formatRupiah(row.final_price) },
          { key: "net", header: "Net", align: "right", render: (row) => formatRupiah(row.net_amount) },
          { key: "cost", header: "Modal", align: "right", render: (row) => formatRupiah(row.unit_cost) },
          { key: "profit", header: "Profit", align: "right", render: (row) => formatRupiah(row.profit_amount) },
          { key: "margin", header: "Margin", align: "right", render: (row) => `${row.margin_percent}%` },
        ]}
        emptyLabel="Belum ada unit terjual."
        getRowKey={(row) => `${row.sale_id}-${row.stock_code ?? row.final_price}`}
        rows={data.units}
      />
    </div>
  );
}

function ProfitLossTab({ data }: { data: ProfitLossReport }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Revenue" value={formatRupiah(data.summary.revenue)} />
        <Metric label="COGS" value={formatRupiah(data.summary.cogs)} />
        <Metric label="Gross Profit" value={formatRupiah(data.summary.gross_profit)} />
        <Metric label="Opex" value={formatRupiah(data.summary.operating_expenses)} />
        <Metric label="Net Profit" value={formatRupiah(data.summary.net_profit)} />
      </section>
      <BalancesTab
        data={{
          accounts: [...data.revenue, ...data.cogs, ...data.expenses],
          summary: { total_debit: 0, total_credit: 0 },
        }}
      />
    </div>
  );
}

function BalanceSheetTab({ data }: { data: BalanceSheetReport }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Assets" value={formatRupiah(data.summary.total_assets)} />
        <Metric label="Liabilities" value={formatRupiah(data.summary.total_liabilities)} />
        <Metric label="Equity" value={formatRupiah(data.summary.total_equity)} />
        <Metric label="L + E" value={formatRupiah(data.summary.liabilities_and_equity)} />
        <Metric
          label="Balance Check"
          tone={data.balance_check.is_balanced ? "neutral" : "danger"}
          value={data.balance_check.is_balanced ? "Seimbang" : formatRupiah(data.balance_check.difference)}
        />
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <BalanceSheetSection rows={data.assets} title="Asset" />
        <BalanceSheetSection rows={data.liabilities} title="Liability" />
        <BalanceSheetSection rows={data.equity} title="Equity" />
      </div>
    </div>
  );
}

function CashFlowTab({ data }: { data: CashFlowReport }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Operating" value={formatRupiah(data.operating.net_amount)} />
        <Metric label="Financing" value={formatRupiah(data.financing.net_amount)} />
        <Metric label="Adjustments" value={formatRupiah(data.adjustments.net_amount)} />
        <Metric label="Net Cash Flow" value={formatRupiah(data.summary.net_cash_flow)} />
        <Metric label="Ending Cash" value={formatRupiah(data.summary.ending_cash_balance)} />
      </section>
      <DataTable
        columns={[
          { key: "date", header: "Tanggal", render: (row) => formatDate(row.transaction_date) },
          { key: "source", header: "Source", render: (row) => <StatusBadge status={row.source_module} /> },
          { key: "category", header: "Kategori", render: (row) => row.cash_flow_category },
          { key: "account", header: "Akun", render: (row) => `${row.account_code} - ${row.account_name}` },
          { key: "amount", header: "Cash Flow", align: "right", render: (row) => formatRupiah(row.cash_flow_amount) },
        ]}
        emptyLabel="Belum ada arus kas."
        getRowKey={(row) => row.line_id}
        rows={data.lines}
      />
    </div>
  );
}

function BalanceSheetSection({ rows, title }: { rows: BalanceSheetLine[]; title: string }) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-stone-600">{title}</h3>
      <div className="grid gap-2">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">Tidak ada saldo.</p>
        ) : (
          rows.map((row) => (
            <div className="flex items-start justify-between gap-3 text-sm" key={`${title}-${row.account_code}`}>
              <span className="text-stone-700">{row.account_name}</span>
              <span className="font-semibold text-stone-950">{formatRupiah(row.amount)}</span>
            </div>
          ))
        )}
      </div>
    </section>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
