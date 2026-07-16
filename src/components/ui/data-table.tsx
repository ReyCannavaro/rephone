import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyLabel?: string;
};

const alignClasses = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyLabel = "Belum ada data.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] border-collapse text-sm lg:min-w-full">
          <thead className="bg-stone-100 text-xs font-semibold uppercase text-stone-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={[
                    "border-b border-stone-200 px-4 py-3",
                    alignClasses[column.align ?? "left"],
                  ].join(" ")}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-stone-500" colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-stone-500">
                      <Inbox size={18} />
                    </span>
                    <span className="text-sm font-medium">{emptyLabel}</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={getRowKey(row)} className="hover:bg-stone-50">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        "align-top px-4 py-3 text-stone-800",
                        alignClasses[column.align ?? "left"],
                      ].join(" ")}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
