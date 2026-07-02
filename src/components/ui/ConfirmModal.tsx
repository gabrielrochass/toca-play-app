"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Confirmation dialog. Renders nothing when `open` is false. Use instead of
 * window.confirm for destructive/irreversible actions.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "danger",
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  variant?: "danger" | "grass" | "amber" | "gold";
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">
        <div className="text-sm text-muted">{message}</div>
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant={variant}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Aguarde…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
