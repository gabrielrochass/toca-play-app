"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Boxes,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldCheck,
  Users,
  Cake,
  GripVertical,
  Move,
} from "lucide-react";
import { SEX_LABELS, SEX_LABELS_SHORT, cn } from "@/lib/utils";
import { isBirthday } from "@/lib/age";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SexIcon } from "@/components/ui/SexIcon";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { type TeenDetail } from "@/components/TeenDetailModal";
import type { Sex } from "@/types/database";
import { generateGroups, fillNewCheckins, moveMember } from "./actions";

// Loaded only when opened (detail modal is heavy; leaders modal is admin-flow).
const TeenDetailModal = dynamic(() =>
  import("@/components/TeenDetailModal").then((m) => m.TeenDetailModal),
);
const LeadersModal = dynamic(() =>
  import("./LeadersModal").then((m) => m.LeadersModal),
);

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
  isFirstTime: boolean;
}

export interface GroupView {
  id: string;
  label: string;
  sex: Sex | null;
  outsideAgeRule: boolean;
  leaderName: string | null;
  members: MemberView[];
}

export interface LeaderRow {
  id: string;
  name: string;
  canLead: boolean;
  isPequenosGrupos: boolean;
  leads: boolean;
}

interface Selected {
  member: MemberView;
  groupId: string;
}

interface DragState {
  memberId: string;
  groupId: string;
  name: string;
  sex: Sex;
}

interface PendingMove {
  memberId: string;
  message: string;
  targetGroupId: string;
}

export function GroupsBoard({
  sessionId,
  sessionDate,
  groups,
  ungroupedCount,
  totalCheckins,
  leaders,
}: {
  sessionId: string;
  sessionDate: string;
  groups: GroupView[];
  ungroupedCount: number;
  totalCheckins: number;
  leaders: LeaderRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Selected | null>(null);
  // "manage" = just edit leaders; "generate" = save then (re)generate groups.
  const [leadersMode, setLeadersMode] = useState<"manage" | "generate" | null>(
    null,
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const run = (fn: () => Promise<void>) => startTransition(fn);

  // Live sync: reflect group moves made on another device. `small_group_members`
  // has no session_id to filter on server-side, so we listen to it broadly but
  // only refresh when the changed row belongs to THIS session's groups. Group
  // create/regenerate is caught via small_groups (server-filtered by session).
  const groupIdsKey = groups
    .map((g) => g.id)
    .sort()
    .join(",");
  useEffect(() => {
    const supabase = createClient();
    const groupIds = new Set(groupIdsKey ? groupIdsKey.split(",") : []);
    const channel = supabase
      .channel(`groups-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "small_groups", filter: `session_id=eq.${sessionId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "small_group_members" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { group_id?: string } | null;
          if (row?.group_id && groupIds.has(row.group_id)) router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, router, groupIdsKey]);

  const leadersCount = leaders.filter((l) => l.leads).length;

  const leadersModal = leadersMode ? (
    <LeadersModal
      sessionId={sessionId}
      leaders={leaders}
      confirmLabel={leadersMode === "generate" ? "Salvar e gerar grupos" : "Salvar líderes"}
      intro={
        leadersMode === "generate"
          ? "Confirme quem vai liderar os pequenos grupos antes de gerar. Quem tem a função “Pequenos grupos” já vem marcado."
          : undefined
      }
      afterSave={
        leadersMode === "generate"
          ? () => generateGroups(sessionId)
          : undefined
      }
      onClose={() => setLeadersMode(null)}
    />
  ) : null;

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
      <>
        <div className="panel flex flex-col items-center gap-4 px-6 py-10 text-center">
          <Boxes className="h-10 w-10 text-grass" strokeWidth={2} />
          <div>
            <p className="text-base font-semibold text-ink">
              Formar pequenos grupos
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Agrupa os {totalCheckins} presentes por sexo e idade parecida. Você
              escolhe os líderes e pode ajustar depois arrastando os nomes.
            </p>
          </div>
          <Button
            variant="grass"
            disabled={pending}
            onClick={() => setLeadersMode("generate")}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.5} /> Gerar grupos
          </Button>
        </div>
        {leadersModal}
      </>
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

  function onDropInto(g: GroupView) {
    setDragOver(null);
    const d = drag;
    setDrag(null);
    if (!d || d.groupId === g.id) return;
    // Cross-sex move needs a confirmation; same-sex moves apply immediately.
    if (g.sex && d.sex !== g.sex) {
      const to = SEX_LABELS_SHORT[g.sex];
      const who = d.sex === "F" ? "uma menina" : "um menino";
      setPendingMove({
        memberId: d.memberId,
        targetGroupId: g.id,
        message: `Mover ${who} (${d.name}) para o grupo de ${to}?`,
      });
    } else {
      run(() => moveMember(sessionId, d.memberId, g.id));
    }
  }

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
        <Button size="sm" disabled={pending} onClick={() => setLeadersMode("manage")}>
          <Users className="h-4 w-4" strokeWidth={2.5} /> Líderes ({leadersCount})
        </Button>
        <Button size="sm" disabled={pending} onClick={() => setLeadersMode("generate")}>
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} /> Regenerar
        </Button>
        <span className="text-xs text-muted">
          Arraste um nome para mover de grupo.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const ages = g.members.map((m) => m.age);
          const min = ages.length ? Math.min(...ages) : 0;
          const max = ages.length ? Math.max(...ages) : 0;
          const range = min === max ? `${min} anos` : `${min}–${max} anos`;
          const isTarget = dragOver === g.id && drag?.groupId !== g.id;
          return (
            <div
              key={g.id}
              onDragOver={(e) => {
                if (drag && drag.groupId !== g.id) {
                  e.preventDefault();
                  setDragOver(g.id);
                }
              }}
              onDragLeave={() => setDragOver((cur) => (cur === g.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                onDropInto(g);
              }}
              className={cn(
                "panel flex flex-col gap-3 p-4 transition-colors",
                isTarget && "border-grass bg-grass/10",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="pixel text-sm text-ink">{g.label}</span>
                <div className="flex items-center gap-1.5">
                  {g.outsideAgeRule ? (
                    <Tooltip label="Diferença de idade maior que 3 anos neste grupo">
                      <AlertTriangle
                        className="h-4 w-4 text-gold"
                        aria-label="Aviso de idade"
                      />
                    </Tooltip>
                  ) : null}
                  {g.sex ? (
                    <Chip tone={g.sex === "M" ? "diamond" : "terra"}>
                      {SEX_LABELS[g.sex]}
                    </Chip>
                  ) : null}
                </div>
              </div>

              <div className="text-xs text-muted">{range}</div>

              <div className="flex items-center gap-1.5 border-y border-night-800 py-2 text-sm">
                <ShieldCheck
                  className={
                    g.leaderName ? "h-4 w-4 text-grass" : "h-4 w-4 text-muted"
                  }
                  strokeWidth={2.25}
                />
                {g.leaderName ? (
                  <span className="text-ink">
                    Líder: <span className="font-semibold">{g.leaderName}</span>
                  </span>
                ) : (
                  <span className="text-muted">Sem líder (marque em Líderes)</span>
                )}
              </div>

              <ul className="flex flex-col gap-1.5">
                {g.members.map((m) => (
                  <li
                    key={m.memberId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", m.memberId);
                      setDrag({
                        memberId: m.memberId,
                        groupId: g.id,
                        name: m.name,
                        sex: m.sex,
                      });
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setDragOver(null);
                    }}
                    className="flex cursor-grab items-center gap-2 border-b border-night-800 pb-1.5 last:border-0 last:pb-0 active:cursor-grabbing"
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <SexIcon sex={m.sex} className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {m.name}
                    </span>
                    {m.isFirstTime ? (
                      <Chip tone="diamond" className="shrink-0">
                        1ª vez
                      </Chip>
                    ) : null}
                    {isBirthday(m.birthdate, sessionDate) ? (
                      <Tooltip label="Aniversário hoje">
                        <Cake className="h-3.5 w-3.5 text-gold" aria-label="Aniversário" />
                      </Tooltip>
                    ) : null}
                    <span className="whitespace-nowrap text-xs text-muted">
                      {m.age} anos
                    </span>
                    {m.assignedManually ? (
                      <Tooltip label="Movido manualmente para este grupo">
                        <Move
                          className="h-3.5 w-3.5 shrink-0 text-gold"
                          aria-label="Movido manualmente"
                        />
                      </Tooltip>
                    ) : null}
                    <Tooltip label="Detalhes">
                      <button
                        type="button"
                        aria-label={`Detalhes de ${m.name}`}
                        onClick={() => setSelected({ member: m, groupId: g.id })}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-gold"
                      >
                        <Info className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {selectedTeen ? (
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
                    run(() =>
                      moveMember(sessionId, selected.member.memberId, target),
                    ),
                }
              : undefined
          }
        />
      ) : null}

      <ConfirmModal
        open={!!pendingMove}
        title="Atenção: grupos são por sexo"
        message={pendingMove?.message ?? ""}
        confirmLabel="Mover mesmo assim"
        variant="amber"
        pending={pending}
        onConfirm={() => {
          const move = pendingMove;
          if (!move) return;
          run(async () => {
            await moveMember(sessionId, move.memberId, move.targetGroupId);
            setPendingMove(null);
          });
        }}
        onClose={() => setPendingMove(null)}
      />

      {leadersModal}
    </div>
  );
}
