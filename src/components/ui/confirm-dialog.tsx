"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "./button";
import { Modal } from "./modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  cancelLabel = "Batal",
  confirmLabel = "Konfirmasi",
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "primary",
}: ConfirmDialogProps) {
  return (
    <Modal
      footer={
        <>
          <Button disabled={loading} onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button disabled={loading} onClick={onConfirm} variant={variant}>
            {loading ? "Memproses..." : confirmLabel}
          </Button>
        </>
      }
      onClose={onCancel}
      open={open}
      title={title}
    >
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={18} />
        <p className="text-sm leading-6">{description}</p>
      </div>
    </Modal>
  );
}
