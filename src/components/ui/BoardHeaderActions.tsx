"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Unlock, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Action = () => Promise<void>;

/**
 * Discreet lifecycle actions (encerrar / reabrir / excluir) as small icon
 * buttons for a detail-screen header — shared by cultos and eventos so the
 * screens stay consistent. Destructive delete confirms; the reversible
 * close/reopen don't. The close icon shows muted + a hint when not yet allowed.
 */
export function BoardHeaderActions({
  closed,
  canClose,
  closeHint,
  closeLabel,
  reopenLabel,
  onClose,
  onReopen,
  canReopen,
  onDelete,
  deleteLabel = "Excluir",
  deleteMessage,
}: {
  closed: boolean;
  /** May close now (e.g. everyone has left). */
  canClose: boolean;
  /** Tooltip shown on the close icon while it's not yet allowed. */
  closeHint?: string;
  closeLabel: string;
  reopenLabel: string;
  onClose: Action;
  onReopen: Action;
  canReopen: boolean;
  onDelete?: Action;
  deleteLabel?: string;
  deleteMessage?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = (fn: Action) => startTransition(() => fn());

  return (
    <div className="flex items-center gap-2">
      {!closed ? (
        <HeaderIcon
          icon={CheckCircle2}
          label={canClose ? closeLabel : closeHint ?? closeLabel}
          disabled={!canClose}
          pending={pending}
          onClick={() => run(onClose)}
        />
      ) : canReopen ? (
        <HeaderIcon
          icon={Unlock}
          label={reopenLabel}
          pending={pending}
          onClick={() => run(onReopen)}
        />
      ) : null}

      {onDelete ? (
        <>
          <HeaderIcon
            icon={Trash2}
            label={deleteLabel}
            danger
            pending={pending}
            onClick={() => setConfirmDelete(true)}
          />
          <ConfirmModal
            open={confirmDelete}
            title={deleteLabel}
            message={deleteMessage}
            confirmLabel="Excluir"
            pending={pending}
            onConfirm={() => run(onDelete)}
            onClose={() => setConfirmDelete(false)}
          />
        </>
      ) : null}
    </div>
  );
}

function HeaderIcon({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
  pending,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  pending?: boolean;
}) {
  // `disabled` (a not-yet-allowed action) stays hoverable so its hint tooltip
  // shows — we block the click ourselves rather than using the disabled attr.
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled || undefined}
        disabled={pending && !disabled}
        onClick={disabled ? undefined : onClick}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-md border transition-colors disabled:opacity-50",
          disabled
            ? "cursor-not-allowed border-night-800 text-muted/50"
            : danger
              ? "border-night-700 text-muted hover:border-redstone hover:text-redstone"
              : "border-night-700 text-muted hover:border-grass hover:text-grass",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </Tooltip>
  );
}
