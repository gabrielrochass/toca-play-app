"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  DoorOpen,
  Undo2,
  Trash2,
  MessageCircle,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ageAt } from "@/lib/age";
import { eventEndMessage, waLink } from "@/lib/whatsapp";
import { unitTone } from "@/lib/units";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Tooltip } from "@/components/ui/Tooltip";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SexIcon } from "@/components/ui/SexIcon";
import { Input } from "@/components/ui/Field";
import { TeenForm } from "@/app/(app)/cadastros/pre-adolescentes/TeenForm";
import type { CheckinStatus, Sex, Unit } from "@/types/database";

import {
  addEventCheckin,
  registerEventTeen,
  addEventVisitor,
  releaseEventCheckin,
  undoEventRelease,
  removeEventCheckin,
} from "../actions";
import { VisitorModal } from "./VisitorModal";

const NotifyGuardiansModal = dynamic(() =>
  import("@/app/(app)/cultos/[id]/NotifyGuardiansModal").then(
    (m) => m.NotifyGuardiansModal,
  ),
);

export interface BoardRow {
  id: string; // checkin id
  name: string;
  isVisitor: boolean;
  unitCode: string | null;
  sex: Sex | null;
  age: number | null;
  status: CheckinStatus;
  guardianName: string | null;
  guardianPhone: string | null;
}

interface SearchResult {
  id: string;
  display_id: string;
  name: string;
  unit_id: string;
  unit_code: string;
  sex: Sex;
  birthdate: string | null;
}

export function EventBoard({
  eventId,
  eventName,
  eventDate,
  scopeUnitId,
  registerUnits,
  rows,
  closed,
}: {
  eventId: string;
  eventName: string;
  eventDate: string;
  /** null for a "Todas" event; a unit id for a unit-scoped event. */
  scopeUnitId: string | null;
  /** Units a new teen can be routed to (all for "Todas", one for a unit event). */
  registerUnits: Unit[];
  rows: BoardRow[];
  closed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [visitorOpen, setVisitorOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const present = rows.filter((r) => r.status === "present");

  const counts = useMemo(() => {
    let p = 0,
      left = 0,
      visitors = 0;
    for (const r of rows) {
      if (r.status === "present") p++;
      else left++;
      if (r.isVisitor) visitors++;
    }
    return { present: p, left, visitors, total: rows.length };
  }, [rows]);

  // Search across units (or the event's unit) via the controlled RPC, which
  // also excludes teens already checked in.
  useEffect(() => {
    const term = q.replace(/[,()%*]/g, " ").trim();
    const timer = setTimeout(async () => {
      if (!term) {
        setResults([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.rpc("search_event_teens", {
        p_event: eventId,
        p_term: term,
      });
      setResults((data ?? []) as SearchResult[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, eventId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-checkins-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_checkins",
          filter: `event_id=eq.${eventId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  const run = (fn: () => Promise<void>) => startTransition(fn);
  const term = q.trim();

  function checkinExisting(r: SearchResult) {
    run(async () => {
      const res = await addEventCheckin(eventId, r.id, r.unit_id);
      if (res?.error) {
        setActionError(res.error);
        return;
      }
      setActionError(null);
      setQ("");
      setResults([]);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <div className="panel border-redstone/50 bg-redstone/10 p-3 text-sm font-medium text-redstone">
          {actionError}
        </div>
      ) : null}

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Presentes" value={counts.present} tone="text-grass" />
        <Tile label="Visitantes" value={counts.visitors} tone="text-diamond" />
        <Tile label="Liberados" value={counts.left} tone="text-muted" />
      </div>

      {/* Notify guardians of everyone still present. Encerrar/Reabrir live in
          the page header (BoardHeaderActions) for consistency across screens. */}
      {!closed && present.length > 0 ? (
        <div>
          <Button size="sm" variant="grass" onClick={() => setNotifyOpen(true)}>
            <MessageCircle className="h-4 w-4" strokeWidth={2.5} /> Notificar
            responsáveis ({present.length})
          </Button>
        </div>
      ) : null}

      {/* Entry: search + register new + add visitor (hidden when closed) */}
      {!closed ? (
        <div className="panel flex flex-col gap-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pré-adolescente já cadastrado (nome ou ID)"
              className="pl-icon"
              aria-label="Buscar pré-adolescente para check-in"
            />
          </div>

          {results.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={r.id} className="block-flat flex items-center gap-3 p-2.5">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-ink">{r.name}</span>
                    <span className="font-mono text-xs leading-tight text-muted">
                      {r.display_id}
                    </span>
                  </span>
                  <Chip tone={unitTone(r.unit_code)}>{r.unit_code}</Chip>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
                    <SexIcon sex={r.sex} className="h-3.5 w-3.5" />
                    {r.birthdate ? `${ageAt(r.birthdate, eventDate)} anos` : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="grass"
                    disabled={pending}
                    onClick={() => checkinExisting(r)}
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={2.5} /> Check-in
                  </Button>
                </li>
              ))}
            </ul>
          ) : term ? (
            <p className="text-sm text-muted">Ninguém encontrado com “{term}”.</p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-night-700 pt-3">
            <Button size="sm" variant="gold" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" strokeWidth={2.5} /> Cadastrar novo
            </Button>
            <Button size="sm" onClick={() => setVisitorOpen(true)}>
              <Star className="h-4 w-4" strokeWidth={2.5} /> Adicionar visitante
            </Button>
          </div>
        </div>
      ) : null}

      {/* Roster */}
      {rows.length === 0 ? (
        <div className="block-flat px-6 py-10 text-center">
          <p className="text-base font-semibold text-ink">Ninguém no evento ainda</p>
          <p className="mt-2 text-sm text-muted">
            Busque, cadastre um novo ou adicione um visitante para começar.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const link = waLink(
              r.guardianPhone,
              eventEndMessage(r.name, r.guardianName ?? undefined, eventName),
            );
            return (
              <li
                key={r.id}
                className="panel flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {r.name}
                </span>
                {r.isVisitor ? (
                  <Chip tone="gold" className="gap-1">
                    <Star className="h-3 w-3" /> Visitante
                  </Chip>
                ) : r.unitCode ? (
                  <Chip tone={unitTone(r.unitCode)}>{r.unitCode}</Chip>
                ) : null}
                {r.sex ? (
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <SexIcon sex={r.sex} className="h-3.5 w-3.5" />
                    {r.age != null ? `${r.age} anos` : ""}
                  </span>
                ) : null}
                {r.status !== "present" ? <StatusBadge status={r.status} /> : null}

                {!closed ? (
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                    {r.status === "present" ? (
                      <>
                        {link ? (
                          <Tooltip label="Avisar responsável (WhatsApp)">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Avisar responsável de ${r.name}`}
                              className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-grass transition-colors hover:border-grass"
                            >
                              <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                            </a>
                          </Tooltip>
                        ) : null}
                        <Button
                          size="sm"
                          variant="amber"
                          disabled={pending}
                          onClick={() =>
                            run(() => releaseEventCheckin(eventId, r.id))
                          }
                        >
                          <DoorOpen className="h-4 w-4" strokeWidth={2.5} /> Liberar
                        </Button>
                        <IconAction
                          title={`Remover ${r.name}`}
                          disabled={pending}
                          onClick={() => run(() => removeEventCheckin(eventId, r.id))}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                        </IconAction>
                      </>
                    ) : (
                      <IconAction
                        title={`Desfazer liberação de ${r.name}`}
                        disabled={pending}
                        onClick={() => run(() => undoEventRelease(eventId, r.id))}
                      >
                        <Undo2 className="h-4 w-4" strokeWidth={2.5} />
                      </IconAction>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {createOpen ? (
        <Modal
          open
          onClose={() => setCreateOpen(false)}
          title="Cadastrar novo e fazer check-in"
          size="lg"
        >
          <p className="mb-4 text-sm text-muted">
            {scopeUnitId
              ? "O pré-adolescente será cadastrado na unidade deste evento."
              : "Escolha a unidade — o pré-adolescente vira um cadastro real dessa unidade e fica registrado no evento."}
          </p>
          <TeenForm
            action={registerEventTeen.bind(null, eventId)}
            // Unit-scoped event → unit is fixed (no picker); "Todas" → choose one.
            units={scopeUnitId ? undefined : registerUnits}
            variant="page"
            initialName={term}
            submitLabel="Cadastrar e fazer check-in"
            onSuccess={() => {
              setCreateOpen(false);
              setQ("");
              setResults([]);
            }}
          />
        </Modal>
      ) : null}

      {visitorOpen ? (
        <VisitorModal
          action={addEventVisitor.bind(null, eventId)}
          initialName={term}
          onClose={() => {
            setVisitorOpen(false);
            setQ("");
            setResults([]);
          }}
        />
      ) : null}

      {notifyOpen ? (
        <NotifyGuardiansModal
          variant="event"
          eventName={eventName}
          teens={present.map((r) => ({
            id: r.id,
            name: r.name,
            guardians: [
              { name: r.guardianName ?? "", phone: r.guardianPhone ?? "" },
            ],
            unitCode: r.isVisitor ? "Visitante" : r.unitCode,
          }))}
          onClose={() => setNotifyOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="panel px-3 py-3 text-center">
      <div className={`font-mono text-3xl leading-none ${tone}`}>{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}

function IconAction({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={title}>
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        {children}
      </button>
    </Tooltip>
  );
}
