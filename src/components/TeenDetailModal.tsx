"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Archive, ArchiveRestore, Cake } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SexIcon } from "@/components/ui/SexIcon";
import { Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { SEX_LABELS, formatDateBR } from "@/lib/utils";
import { ageAt, isBirthday } from "@/lib/age";
import type { Sex } from "@/types/database";

export interface TeenGuardian {
  name: string;
  phone: string;
  relationship?: string | null;
}

export interface TeenDetail {
  id: string;
  display_id: string;
  name: string;
  sex: Sex;
  birthdate: string;
  guardian_name: string;
  guardian_phone: string;
  guardians?: TeenGuardian[];
  neighborhood?: string | null;
  observations?: string | null;
  is_active?: boolean;
}

export interface GroupMoveProps {
  groups: { id: string; label: string }[];
  currentGroupId: string;
  onMove: (targetGroupId: string) => void;
  pending?: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-night-800 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export function TeenDetailModal({
  teen,
  refDate,
  onClose,
  groupMove,
  onRemove,
  onReactivate,
}: {
  teen: TeenDetail | null;
  refDate: string | Date;
  onClose: () => void;
  groupMove?: GroupMoveProps;
  /** When provided, shows a "Remover" (inactivate) button. */
  onRemove?: (id: string) => void | Promise<void>;
  /** When provided, shows a "Reativar" button (for the inactive list). */
  onReactivate?: (id: string) => void | Promise<void>;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, start] = useTransition();

  const guardians: TeenGuardian[] =
    teen?.guardians?.length
      ? teen.guardians
      : teen
        ? [{ name: teen.guardian_name, phone: teen.guardian_phone }]
        : [];

  const birthday = teen ? isBirthday(teen.birthdate, refDate) : false;

  return (
    <>
      <Modal open={!!teen && !confirmRemove} onClose={onClose} title={teen?.display_id ?? ""}>
        {teen ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-ink">
                {teen.name}
                {birthday ? (
                  <Chip tone="gold" className="gap-1">
                    <Cake className="h-3.5 w-3.5" /> Aniversário
                  </Chip>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <SexIcon sex={teen.sex} className="h-4 w-4" />
                {SEX_LABELS[teen.sex]} · {ageAt(teen.birthdate, refDate)} anos
              </div>
            </div>

            <div className="rounded-md border border-night-700 px-3">
              <Row label="Nascimento" value={formatDateBR(teen.birthdate)} />
              {teen.neighborhood ? (
                <Row label="Bairro" value={teen.neighborhood} />
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                Responsáveis
              </div>
              <div className="flex flex-col gap-2">
                {guardians.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-night-800 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">
                        {g.name}
                        {g.relationship ? (
                          <span className="ml-1 text-xs font-normal text-muted">
                            ({g.relationship})
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted">{g.phone}</div>
                    </div>
                    {i === 0 ? <Chip tone="diamond">Principal</Chip> : null}
                  </div>
                ))}
              </div>
            </div>

            {teen.observations ? (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Observações
                </div>
                <p className="whitespace-pre-wrap rounded-md border border-night-800 px-3 py-2 text-sm text-ink">
                  {teen.observations}
                </p>
              </div>
            ) : null}

            {groupMove ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-muted">
                  Mover para outro grupo
                </span>
                <Select
                  value=""
                  disabled={groupMove.pending}
                  onChange={(e) => {
                    if (e.target.value) {
                      groupMove.onMove(e.target.value);
                      onClose();
                    }
                  }}
                >
                  <option value="">Selecione um grupo…</option>
                  {groupMove.groups
                    .filter((g) => g.id !== groupMove.currentGroupId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                </Select>
              </label>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/cadastros/pre-adolescentes/${teen.id}/editar`}
                className="mc-btn mc-btn-sm"
              >
                <Pencil className="h-4 w-4" strokeWidth={2.5} /> Editar
              </Link>
              {onReactivate ? (
                <button
                  type="button"
                  onClick={() => start(async () => { await onReactivate(teen.id); onClose(); })}
                  disabled={pending}
                  className="mc-btn mc-btn-grass mc-btn-sm"
                >
                  <ArchiveRestore className="h-4 w-4" strokeWidth={2.5} /> Reativar
                </button>
              ) : onRemove ? (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  className="mc-btn mc-btn-danger mc-btn-sm"
                >
                  <Archive className="h-4 w-4" strokeWidth={2.5} /> Inativar
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {teen && onRemove ? (
        <ConfirmModal
          open={confirmRemove}
          title="Inativar pré-adolescente"
          variant="danger"
          confirmLabel="Inativar"
          pending={pending}
          message={
            <>
              Inativar <b>{teen.name}</b>? Ele some das listas, mas o histórico de
              check-ins é preservado. Você pode reativar depois.
            </>
          }
          onConfirm={() =>
            start(async () => {
              await onRemove(teen.id);
              setConfirmRemove(false);
              onClose();
            })
          }
          onClose={() => setConfirmRemove(false)}
        />
      ) : null}
    </>
  );
}
