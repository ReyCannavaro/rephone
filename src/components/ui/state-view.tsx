import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
      <Inbox className="mb-3 text-stone-500" size={28} />
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-stone-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Memuat data" }: LoadingStateProps) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 rounded-md border border-stone-200 bg-white text-sm font-medium text-stone-600">
      <Loader2 className="animate-spin" size={18} />
      {label}
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  message,
  onRetry,
  title = "Terjadi masalah",
}: ErrorStateProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0" size={18} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-red-800">{message}</p>
          {onRetry ? (
            <Button className="mt-3" onClick={onRetry} variant="secondary">
              Coba lagi
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
