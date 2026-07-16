"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: "default" | "wide";
};

export function Modal({
  children,
  description,
  footer,
  onClose,
  open,
  title,
  width = "default",
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4">
      <div
        className={[
          "w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-xl",
          width === "wide" ? "max-w-5xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-stone-600">{description}</p> : null}
          </div>
          <Button
            aria-label="Tutup modal"
            className="size-9 px-0"
            icon={<X size={16} />}
            onClick={onClose}
            variant="ghost"
          />
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
