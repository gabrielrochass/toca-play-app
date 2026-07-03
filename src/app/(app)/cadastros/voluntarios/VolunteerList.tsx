"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Archive, ArchiveRestore } from "lucide-react";
import { VOLUNTEER_FUNCTION_LABELS, type VolunteerFunction } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { setVolunteerActive } from "./actions";

export interface VolunteerRow {
  id: string;
  name: string;
  phone: string | null;
  functions: VolunteerFunction[];
}

export function VolunteerList({
  volunteers,
  canManage,
  showInactive,
  emptyLabel,
}: {
  volunteers: VolunteerRow[];
  canManage: boolean;
  showInactive: boolean;
  emptyLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState<VolunteerRow | null>(null);

  if (volunteers.length === 0) {
    return (
      <p className="rounded-md border border-night-800 px-4 py-8 text-center text-sm text-muted">
        {emptyLabel ?? "Nenhum voluntário."}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {volunteers.map((v) => (
          <li key={v.id} className="panel flex items-center gap-4 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-night-600 bg-night-800 font-display text-sm text-orange">
              {v.name.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-ink">
                {v.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted">
                {v.phone ?? "Sem telefone"}
              </div>
              {v.functions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.functions.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-[5px] bg-night-700 px-2 py-0.5 text-xs font-medium text-ink"
                    >
                      {VOLUNTEER_FUNCTION_LABELS[f]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {canManage ? (
              <div className="flex shrink-0 items-center gap-2 self-start">
                <Tooltip label="Editar">
                  <Link
                    href={`/cadastros/voluntarios/${v.id}/editar`}
                    aria-label={`Editar ${v.name}`}
                    className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:border-orange hover:text-orange"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={2.5} />
                  </Link>
                </Tooltip>
                {showInactive ? (
                  <Tooltip label="Reativar">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => start(() => setVolunteerActive(v.id, true))}
                      aria-label={`Reativar ${v.name}`}
                      className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-grass transition-colors hover:border-grass disabled:opacity-50"
                    >
                      <ArchiveRestore className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip label="Inativar">
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(v)}
                      aria-label={`Inativar ${v.name}`}
                      className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:border-redstone hover:text-redstone"
                    >
                      <Archive className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </Tooltip>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={!!confirmRemove}
        title="Inativar voluntário"
        variant="danger"
        confirmLabel="Inativar"
        pending={pending}
        message={
          <>
            Inativar <b>{confirmRemove?.name}</b>? Ele some das listas, mas o
            histórico de presença é preservado. Você pode reativar depois.
          </>
        }
        onConfirm={() => {
          const v = confirmRemove;
          if (!v) return;
          start(async () => {
            await setVolunteerActive(v.id, false);
            setConfirmRemove(null);
          });
        }}
        onClose={() => setConfirmRemove(null)}
      />
    </>
  );
}
