"use client";

import { useState, useTransition } from "react";
import {
  Boxes,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldCheck,
} from "lucide-react";
import { SEX_LABELS } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SexIcon } from "@/components/ui/SexIcon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TeenDetailModal, type TeenDetail } from "@/components/TeenDetailModal";
import type { Sex } from "@/types/database";
import { generateGroups, fillNewCheckins, moveMember } from "./actions";

export interface MemberView {
  memberId: string;
  teenId: string;
  displayId: string;
  name: string;
  age: number;
  sex: Sex;
  birthdate: string;
  guardianName: string;
  guardianPhone: string;
  assignedManually: boolean;
}

export interface GroupView {
  id: string;
  label: string;
  sex: Sex | null;
  outsideAgeRule: boolean;
  leaderName: string | null;
  members: MemberView[];
}

interface Selected {
  member: MemberView;
  groupId: string;
}

export function GroupsBoard({
  sessionId,
  sessionDate,
  groups,
  ungroupedCount,
  totalCheckins,
}: {
  sessionId: string;
  sessionDate: string;
  groups: GroupView[];
  ungroupedCount: number;
  totalCheckins: number;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [showRegen, setShowRegen] = useState(false);
  const run = (fn: () => Promise<void>) => startTransition(fn);

  if (totalCheckins === 0) {
    return (
      <div className="block-flat px-6 py-10 text-center">
        <p className="text-base font-semibold text-ink">Sem check-ins ainda</p>
        <p className="mt-2 text-sm text-muted">
          Faça os check-ins na aba Check-in para depois formar os grupos.
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-10 text-center">
        <Boxes className="h-10 w-10 text-grass" strokeWidth={2} />
        <div>
          <p className="text-base font-semibold text-ink">Formar pequenos grupos</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Agrupa os {totalCheckins} presentes por sexo e idade parecida (3 a 4 por
            grupo). Você pode ajustar depois.
          </p>
        </div>
        <Button
          variant="grass"
          disabled={pending}
          onClick={() => run(() => generateGroups(sessionId))}
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.5} /> Gerar grupos
        </Button>
      </div>
    );
  }

  const groupOptions = groups.map((g) => ({ id: g.id, label: g.label }));

  const selectedTeen: TeenDetail | null = selected
    ? {
        id: selected.member.teenId,
        display_id: selected.member.displayId,
        name: selected.member.name,
        sex: selected.member.sex,
        birthdate: selected.member.birthdate,
        guardian_name: selected.member.guardianName,
        guardian_phone: selected.member.guardianPhone,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {ungroupedCount > 0 ? (
          <Button
            variant="grass"
            size="sm"
            disabled={pending}
            onClick={() => run(() => fillNewCheckins(sessionId))}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.5} /> Agrupar novos (
            {ungroupedCount})
          </Button>
        ) : null}
        <Button size="sm" disabled={pending} onClick={() => setShowRegen(true)}>
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} /> Regenerar tudo
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const ages = g.members.map((m) => m.age);
          const min = ages.length ? Math.min(...ages) : 0;
          const max = ages.length ? Math.max(...ages) : 0;
          const range = min === max ? `${min} anos` : `${min}–${max} anos`;
          return (
            <div key={g.id} className="panel flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="pixel text-sm text-ink">{g.label}</span>
                {g.sex ? (
                  <Chip tone={g.sex === "M" ? "diamond" : "terra"}>
                    {SEX_LABELS[g.sex]}
                  </Chip>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">{range}</span>
                {g.outsideAgeRule ? (
                  <span className="flex items-center gap-1 font-medium text-gold">
                    <AlertTriangle className="h-3.5 w-3.5" /> idades &gt; 3 anos
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5 border-y border-night-800 py-2 text-sm">
                <ShieldCheck
                  className={g.leaderName ? "h-4 w-4 text-grass" : "h-4 w-4 text-muted"}
                  strokeWidth={2.25}
                />
                {g.leaderName ? (
                  <span className="text-ink">
                    Líder: <span className="font-semibold">{g.leaderName}</span>
                  </span>
                ) : (
                  <span className="text-muted">Sem líder (marque voluntários)</span>
                )}
              </div>

              <ul className="flex flex-col gap-1.5">
                {g.members.map((m) => (
                  <li
                    key={m.memberId}
                    className="flex items-center gap-2 border-b border-night-800 pb-1.5 last:border-0 last:pb-0"
                  >
                    <SexIcon sex={m.sex} className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {m.name}
                    </span>
                    <span className="text-xs text-muted">{m.age} anos</span>
                    {m.assignedManually ? (
                      <span className="text-gold" title="Movido manualmente">
                        •
                      </span>
                    ) : null}
                    <button
                      type="button"
                      title={`Detalhes de ${m.name}`}
                      onClick={() => setSelected({ member: m, groupId: g.id })}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-gold"
                    >
                      <Info className="h-4 w-4" strokeWidth={2.5} />
                      <span className="sr-only">Detalhes de {m.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <TeenDetailModal
        teen={selectedTeen}
        refDate={sessionDate}
        onClose={() => setSelected(null)}
        groupMove={
          selected
            ? {
                groups: groupOptions,
                currentGroupId: selected.groupId,
                pending,
                onMove: (target) =>
                  run(() => moveMember(sessionId, selected.member.memberId, target)),
              }
            : undefined
        }
      />

      <ConfirmModal
        open={showRegen}
        title="Regenerar grupos"
        message="Isto refaz todos os grupos do zero e descarta os ajustes manuais. Continuar?"
        confirmLabel="Regenerar tudo"
        variant="amber"
        pending={pending}
        onConfirm={() => {
          setShowRegen(false);
          run(() => generateGroups(sessionId));
        }}
        onClose={() => setShowRegen(false)}
      />
    </div>
  );
}
