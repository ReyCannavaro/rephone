"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "./button";

type ToastVariant = "success" | "error";

type ToastInput = {
  title: string;
  message?: string;
  variant?: ToastVariant;
};

type Toast = ToastInput & {
  id: number;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-950",
};

const iconClasses: Record<ToastVariant, string> = {
  success: "text-emerald-700",
  error: "text-red-700",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, title, variant = "success" }: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-3), { id, message, title, variant }]);
      window.setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[70] grid w-[calc(100vw-2rem)] max-w-sm gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => {
          const Icon = toast.variant === "success" ? CheckCircle2 : XCircle;

          return (
            <div
              className={[
                "rounded-md border p-4 shadow-lg shadow-stone-950/10",
                variantClasses[toast.variant],
              ].join(" ")}
              key={toast.id}
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon className={["mt-0.5 shrink-0", iconClasses[toast.variant]].join(" ")} size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.message ? <p className="mt-1 text-sm opacity-85">{toast.message}</p> : null}
                </div>
                <Button
                  aria-label="Tutup notifikasi"
                  className="size-7 shrink-0 px-0"
                  icon={<X size={14} />}
                  onClick={() => dismissToast(toast.id)}
                  variant="ghost"
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
