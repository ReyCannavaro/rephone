"use client";

import { Eye, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextInput } from "@/components/ui/form-field";
import { ErrorState, LoadingState } from "@/components/ui/state-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApi } from "@/lib/api/client";
import type { AuditLogRecord, AuditLogsResponse } from "@/lib/audit/audit-ui-types";

const actionOptions = [
  { label: "Semua action", value: "" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Accept", value: "ACCEPT" },
  { label: "Reject", value: "REJECT" },
  { label: "Sale", value: "SALE" },
  { label: "Reversal", value: "REVERSAL" },
];

export function AuditLogView() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = `${today.slice(0, 8)}01`;
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [action, setAction] = useState("");
  const [entityTable, setEntityTable] = useState("");
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ limit: "200" });
        if (action) {
          params.set("action", action);
        }
        if (entityTable.trim()) {
          params.set("entity_table", entityTable.trim());
        }
        if (dateFrom) {
          params.set("date_from", dateFrom);
        }
        if (dateTo) {
          params.set("date_to", dateTo);
        }

        const data = await fetchApi<AuditLogsResponse>(`/api/audit-logs?${params.toString()}`, {
          signal: controller.signal,
        });
        setLogs(data.logs);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Audit log gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => controller.abort();
  }, [action, dateFrom, dateTo, entityTable, reloadKey]);

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-[180px_1fr_180px_180px_auto]">
        <SelectField
          label="Action"
          onChange={(event) => setAction(event.target.value)}
          options={actionOptions}
          value={action}
        />
        <TextInput
          label="Entity"
          onChange={(event) => setEntityTable(event.target.value)}
          placeholder="sales, unit_receipts, phone_units"
          value={entityTable}
        />
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

      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState label="Memuat audit log" />
      ) : (
        <DataTable
          columns={[
            {
              key: "time",
              header: "Waktu",
              render: (row) => (
                <div>
                  <p className="font-medium text-stone-950">{formatDateTime(row.event_time)}</p>
                  <p className="text-xs text-stone-500">{row.request_method ?? "-"} {row.request_path ?? ""}</p>
                </div>
              ),
            },
            {
              key: "action",
              header: "Action",
              render: (row) => <StatusBadge status={row.action} />,
            },
            {
              key: "entity",
              header: "Entity",
              render: (row) => (
                <div>
                  <p className="font-medium text-stone-950">{row.entity_table}</p>
                  <p className="max-w-56 truncate text-xs text-stone-500">{row.entity_id ?? "-"}</p>
                </div>
              ),
            },
            {
              key: "actor",
              header: "Actor",
              render: (row) => (
                <div>
                  <p>{row.actor_email ?? "System"}</p>
                  <p className="text-xs text-stone-500">{row.actor_role ?? "-"}</p>
                </div>
              ),
            },
            {
              key: "reason",
              header: "Reason",
              render: (row) => <span className="max-w-72 truncate">{row.reason ?? "-"}</span>,
            },
            {
              key: "action_button",
              header: "",
              align: "right",
              render: (row) => (
                <Button icon={<Eye size={15} />} onClick={() => setSelectedLog(row)} variant="secondary">
                  Detail
                </Button>
              ),
            },
          ]}
          emptyLabel="Belum ada audit log untuk filter ini."
          getRowKey={(row) => row.id}
          rows={logs}
        />
      )}

      <Modal
        description={selectedLog ? `${selectedLog.entity_table} / ${selectedLog.entity_id ?? "-"}` : undefined}
        onClose={() => setSelectedLog(null)}
        open={Boolean(selectedLog)}
        title={selectedLog ? `${selectedLog.action} Audit Detail` : "Audit Detail"}
        width="wide"
      >
        {selectedLog ? <AuditDetail log={selectedLog} /> : null}
      </Modal>
    </div>
  );
}

function AuditDetail({ log }: { log: AuditLogRecord }) {
  return (
    <div className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
      <section className="grid gap-3 rounded-md bg-stone-50 p-3 text-sm sm:grid-cols-2">
        <Info label="Event Time" value={formatDateTime(log.event_time)} />
        <Info label="Actor" value={log.actor_email ?? "System"} />
        <Info label="Entity" value={log.entity_table} />
        <Info label="Entity ID" value={log.entity_id ?? "-"} />
        <Info label="Request" value={`${log.request_method ?? "-"} ${log.request_path ?? ""}`} />
        <Info label="Reason" value={log.reason ?? "-"} />
      </section>
      <JsonPanel label="Old Values" value={log.old_values} />
      <JsonPanel label="New Values" value={log.new_values} />
      <JsonPanel label="Metadata" value={log.metadata} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 break-all font-medium text-stone-900">{value}</p>
    </div>
  );
}

function JsonPanel({ label, value }: { label: string; value: unknown }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-stone-950">{label}</h3>
      <pre className="max-h-80 overflow-auto rounded-md border border-stone-200 bg-stone-950 p-3 text-xs leading-5 text-stone-100">
        {value == null ? "-" : JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
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
