type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const statusToneMap: Record<string, StatusTone> = {
  DRAFT: "neutral",
  INSPECTION: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  IN_STOCK: "success",
  RESERVED: "warning",
  SOLD: "neutral",
  RETURNED: "info",
  SERVICE: "warning",
  DAMAGED: "danger",
  COMPLETED: "success",
  CANCELLED: "danger",
  POSTED: "success",
  REVERSED: "warning",
};

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-stone-300 bg-stone-100 text-stone-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
};

type StatusBadgeProps = {
  status: string;
  tone?: StatusTone;
};

export function StatusBadge({ status, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? statusToneMap[status] ?? "neutral";

  return (
    <span
      className={[
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold uppercase tracking-normal",
        toneClasses[resolvedTone],
      ].join(" ")}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
