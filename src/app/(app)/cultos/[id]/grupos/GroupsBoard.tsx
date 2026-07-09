"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  ArrowRightLeft,
  CornerDownRight,
  X,
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

/** A member picked for tap-to-move; the board is in "move mode" while set. */
interface Moving {
  member: MemberView;
  fromGroupId: string;
}

/** Live pointer-drag state (mouse + touch), driving the floating ghost. */
interface PointerDrag {
  member: MemberView;
  x: number;
  y: number;
}

interface PendingMove {
  member: MemberView;
  fromGroupId: string;
  targetGroupId: string;
  message: string;
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
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  // Drag (segurar a alça e arrastar — mouse + toque) and its lightweight tap
  // alternative (tocar Mover → tocar no grupo destino).
  const [pointerDrag, setPointerDrag] = useState<PointerDrag | null>(null);
  const [moving, setMoving] = useState<Moving | null>(null);
  const autoScrollDir = useRef(0);
  const autoScrollRaf = useRef<number | null>(null);
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

  // Cancel any running auto-scroll frame on unmount.
  useEffect(
    () => () => {
      if (autoScrollRaf.current != null) cancelAnimationFrame(autoScrollRaf.current);
    },
    [],
  );

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

  // ---- Move (shared by pointer-drag and tap-to-move) ---------------------
  // Cross-sex needs a confirmation; same-sex applies immediately.
  function requestMove(member: MemberView, fromGroupId: string, target: GroupView) {
    setMoving(null);
    setPointerDrag(null);
    setDragOver(null);
    if (fromGroupId === target.id) return;
    if (target.sex && member.sex !== target.sex) {
      const to = SEX_LABELS_SHORT[target.sex];
      const who = member.sex === "F" ? "uma menina" : "um menino";
      setPendingMove({
        member,
        fromGroupId,
        targetGroupId: target.id,
        message: `Mover ${who} (${member.name}) para o grupo de ${to}?`,
      });
      return;
    }
    run(() => moveMember(sessionId, member.memberId, target.id));
  }

  // ---- Pointer-drag from the grip handle (works on mouse AND touch) -------
  function groupIdAtPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    return el?.closest("[data-group-id]")?.getAttribute("data-group-id") ?? null;
  }

  function tickAutoScroll() {
    if (autoScrollDir.current !== 0) {
      window.scrollBy(0, autoScrollDir.current);
      autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
    } else {
      autoScrollRaf.current = null;
    }
  }
  function updateAutoScroll(clientY: number) {
    const EDGE = 72;
    const SPEED = 12;
    autoScrollDir.current =
      clientY < EDGE ? -SPEED : clientY > window.innerHeight - EDGE ? SPEED : 0;
    if (autoScrollDir.current !== 0 && autoScrollRaf.current == null) {
      autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
    }
  }
  function stopAutoScroll() {
    autoScrollDir.current = 0;
    if (autoScrollRaf.current != null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  }

  // Press the grip and drag (mouse + touch). We listen on window (not the grip)
  // so the drag keeps tracking even when the pointer leaves the handle — more
  // robust than relying on pointer capture. `touch-none` on the grip stops the
  // page from scrolling when the drag starts on it.
  function onGripPointerDown(
    e: React.PointerEvent,
    member: MemberView,
    fromGroupId: string,
  ) {
    if (e.button != null && e.button > 0) return; // primary button / touch only
    e.preventDefault();
    setPointerDrag({ member, x: e.clientX, y: e.clientY });

    const onMove = (ev: PointerEvent) => {
      setPointerDrag((cur) => (cur ? { ...cur, x: ev.clientX, y: ev.clientY } : cur));
      const gid = groupIdAtPoint(ev.clientX, ev.clientY);
      setDragOver(gid && gid !== fromGroupId ? gid : null);
      updateAutoScroll(ev.clientY);
    };
    const finish = (ev: PointerEvent, drop: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      stopAutoScroll();
      setPointerDrag(null);
      setDragOver(null);
      if (!drop) return;
      const gid = groupIdAtPoint(ev.clientX, ev.clientY);
      if (gid && gid !== fromGroupId) {
        const target = groups.find((x) => x.id === gid);
        if (target) requestMove(member, fromGroupId, target);
      }
    };
    const onUp = (ev: PointerEvent) => finish(ev, true);
    const onCancel = (ev: PointerEvent) => finish(ev, false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  return (
    <div className={cn("flex flex-col gap-4", pointerDrag && "select-none")}>
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
          Arraste pela alça <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" /> ou
          toque em <b className="font-semibold">Mover</b> para trocar de grupo.
        </span>
      </div>

      {/* Move mode banner — shows who is being moved; tap a target group below. */}
      {moving ? (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-md border border-gold/60 bg-gold/10 px-3 py-2 md:top-4">
          <ArrowRightLeft className="h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} />
          <span className="min-w-0 flex-1 wrap-break-word text-sm text-ink">
            Movendo <b className="font-semibold">{moving.member.name}</b> — toque no grupo de
            destino.
          </span>
          <Button size="sm" className="shrink-0" onClick={() => setMoving(null)}>
            <X className="h-4 w-4" strokeWidth={2.5} /> Cancelar
          </Button>
        </div>
      ) : null}

      {/* grid-cols-1 explícito: sem ele o track mobile é auto (tamanho do
          conteúdo) e nome longo estoura a largura. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const ages = g.members.map((m) => m.age);
          const min = ages.length ? Math.min(...ages) : 0;
          const max = ages.length ? Math.max(...ages) : 0;
          const range = min === max ? `${min} anos` : `${min}–${max} anos`;
          const isTarget = dragOver === g.id; // pointer-drag hover highlight
          const isOrigin = moving?.fromGroupId === g.id;
          const isMoveTarget = !!moving && !isOrigin;
          return (
            <div
              key={g.id}
              data-group-id={g.id}
              className={cn(
                "panel flex flex-col gap-3 p-4 transition-colors",
                isTarget && "border-grass bg-grass/10",
                isMoveTarget && "border-2 border-dashed border-grass/70",
                isOrigin && "opacity-60 ring-1 ring-inset ring-gold/50",
              )}
            >
              {isMoveTarget && moving ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => requestMove(moving.member, moving.fromGroupId, g)}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-(--color-grass-fill) px-3 py-2 text-sm font-semibold text-[#10240a] transition-colors hover:brightness-105 disabled:opacity-50"
                >
                  <CornerDownRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span className="min-w-0 truncate">Mover {moving.member.name} aqui</span>
                </button>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <span className="pixel text-sm text-ink">{g.label}</span>
                <div className="flex items-center gap-1.5">
                  {isOrigin ? <Chip tone="gold">Origem</Chip> : null}
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
                    className={cn(
                      "flex items-center gap-2 rounded-md border-b border-night-800 px-1 py-1.5 last:border-0",
                      pointerDrag?.member.memberId === m.memberId && "opacity-40",
                    )}
                  >
                    {/* Drag handle — segura e arrasta (mouse + toque). touch-none
                        para o toque na alça não rolar a página. */}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Arrastar ${m.name} para outro grupo`}
                      onPointerDown={(e) => onGripPointerDown(e, m, g.id)}
                      className="grid h-7 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted transition-colors hover:text-ink active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
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
                    <Tooltip label="Mover de grupo">
                      <button
                        type="button"
                        disabled={pending}
                        aria-label={`Mover ${m.name} de grupo`}
                        onClick={() => setMoving({ member: m, fromGroupId: g.id })}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-grass disabled:opacity-50"
                      >
                        <ArrowRightLeft className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </Tooltip>
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

      {/* Floating ghost that follows the pointer while dragging. */}
      {pointerDrag ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-grass bg-night-850 px-2.5 py-1 text-sm font-medium text-ink shadow-lg"
          style={{ left: pointerDrag.x, top: pointerDrag.y - 10 }}
        >
          {pointerDrag.member.name}
        </div>
      ) : null}

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
            await moveMember(sessionId, move.member.memberId, move.targetGroupId);
            setPendingMove(null);
          });
        }}
        onClose={() => setPendingMove(null)}
      />

      {leadersModal}
    </div>
  );
}
