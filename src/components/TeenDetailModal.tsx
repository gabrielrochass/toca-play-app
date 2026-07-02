"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SexIcon } from "@/components/ui/SexIcon";
import { Select } from "@/components/ui/Field";
import { SEX_LABELS, formatDateBR } from "@/lib/utils";
import { ageAt } from "@/lib/age";
import type { Sex } from "@/types/database";

export interface TeenDetail {
  id: string;
  display_id: string;
  name: string;
  sex: Sex;
  birthdate: string;
  guardian_name: string;
  guardian_phone: string;
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
}: {
  teen: TeenDetail | null;
  refDate: string | Date;
  onClose: () => void;
  groupMove?: GroupMoveProps;
}) {
  return (
    <Modal open={!!teen} onClose={onClose} title={teen?.display_id ?? ""}>
      {teen ? (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-lg font-semibold text-ink">{teen.name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <SexIcon sex={teen.sex} className="h-4 w-4" />
              {SEX_LABELS[teen.sex]} · {ageAt(teen.birthdate, refDate)} anos
            </div>
          </div>

          <div className="rounded-md border border-night-700 px-3">
            <Row label="Nascimento" value={formatDateBR(teen.birthdate)} />
            <Row label="Responsável" value={teen.guardian_name} />
            <Row label="Telefone" value={teen.guardian_phone} />
          </div>

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

          <Link
            href={`/cadastros/pre-adolescentes/${teen.id}/editar`}
            className="mc-btn mc-btn-sm self-start"
          >
            <Pencil className="h-4 w-4" strokeWidth={2.5} /> Editar cadastro
          </Link>
        </div>
      ) : null}
    </Modal>
  );
}
