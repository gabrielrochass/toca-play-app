"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  DoorOpen,
  Undo2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ageAt } from "@/lib/age";
import { guardianMessage, waLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SexIcon } from "@/components/ui/SexIcon";
import { Input } from "@/components/ui/Field";
import { NotifyGuardiansModal } from "./NotifyGuardiansModal";
import type { CheckinStatus, Sex } from "@/types/database";
import {
  addCheckin,
  releaseCheckin,
  undoRelease,
  removeCheckin,
  closeSession,
  reopenSession,
  quickCreateAndCheckin,
} from "./actions";
import { QuickCreateTeenModal } from "./QuickCreateTeenModal";

export interface BoardCheckin {
  id: string;
  teenId: string;
  displayId: string;
  name: string;
  sex: Sex;
  age: number;
  status: CheckinStatus;
  guardianName: string;
  guardianPhone: string;
}

interface SearchResult {
  id: string;
  display_id: string;
  name: string;
  sex: Sex;
  birthdate: string;
}

export function CheckinBoard({
  sessionId,
  unitId,
  sessionDate,
  checkins,
  closed,
  canReopen,
}: {
  sessionId: string;
  unitId: string;
  sessionDate: string;
  checkins: BoardCheckin[];
  closed: boolean;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const presentTeens = checkins.filter((c) => c.status === "present");

  const checkedInIds = useMemo(
    () => new Set(checkins.map((c) => c.teenId)),
    [checkins],
  );

  const counts = useMemo(() => {
    let present = 0,
      left = 0;
    for (const c of checkins) {
      if (c.status === "present") present++;
      else left++;
    }
    return { present, left, total: checkins.length };
  }, [checkins]);

  const everyoneLeft = counts.total > 0 && counts.present === 0;

  useEffect(() => {
    const term = q.replace(/[,()%*]/g, " ").trim();
    const timer = setTimeout(async () => {
      if (!term) {
        setResults([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("teens")
        .select("id,display_id,name,sex,birthdate")
        .eq("is_active", true)
        .eq("unit_id", unitId)
        .or(`name.ilike.%${term}%,display_id.ilike.%${term}%`)
        .limit(8);
      setResults((data ?? []).filter((r) => !checkedInIds.has(r.id)));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, checkedInIds, unitId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`checkins-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  const run = (fn: () => Promise<void>) => startTransition(fn);
  const term = q.trim();

  return (
    <div className="flex flex-col gap-4">
      {/* Close / reopen bar */}
      {closed ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-gold/40 p-4">
          <span className="flex items-center gap-2 font-semibold text-gold">
            <Lock className="h-4 w-4" /> Culto encerrado
          </span>
          {canReopen ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => reopenSession(sessionId))}
            >
              <Unlock className="h-4 w-4" strokeWidth={2.5} /> Reabrir
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Presentes" value={counts.present} tone="text-grass" />
        <Tile label="Liberados" value={counts.left} tone="text-muted" />
      </div>

      {/* Actions: notify + close */}
      {!closed ? (
        <div className="flex flex-wrap items-center gap-3">
          {presentTeens.length > 0 ? (
            <Button
              size="sm"
              variant="grass"
              onClick={() => setNotifyOpen(true)}
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2.5} /> Notificar
              responsáveis ({presentTeens.length})
            </Button>
          ) : null}
          <Button
            variant={everyoneLeft ? "amber" : "default"}
            size="sm"
            disabled={pending || !everyoneLeft}
            onClick={() => run(() => closeSession(sessionId))}
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> Encerrar culto
          </Button>
          {!everyoneLeft && counts.total > 0 ? (
            <span className="text-xs text-muted">
              Libere a saída de todos para encerrar.
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Add check-in (hidden when closed) */}
      {!closed ? (
        <div className="panel p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou ID para fazer check-in"
              className="pl-icon"
              aria-label="Buscar pré-adolescente para check-in"
            />
          </div>

          {results.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {results.map((r) => (
                <li key={r.id} className="block-flat flex items-center gap-3 p-2.5">
                  <span className="font-mono text-lg leading-none text-muted">
                    {r.display_id}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {r.name}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <SexIcon sex={r.sex} className="h-3.5 w-3.5" />
                    {ageAt(r.birthdate, sessionDate)} anos
                  </span>
                  <Button
                    size="sm"
                    variant="grass"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await addCheckin(sessionId, r.id);
                        setQ("");
                        setResults([]);
                      })
                    }
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={2.5} /> Check-in
                  </Button>
                </li>
              ))}
            </ul>
          ) : term ? (
            <div className="mt-3 flex flex-col items-start gap-2">
              <p className="text-sm text-muted">
                Ninguém encontrado com “{term}”.
              </p>
              <Button
                size="sm"
                variant="gold"
                onClick={() => setCreateOpen(true)}
              >
                <UserPlus className="h-4 w-4" strokeWidth={2.5} /> Cadastrar “
                {term}” e fazer check-in
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Checked-in list */}
      {checkins.length === 0 ? (
        <div className="block-flat px-6 py-10 text-center">
          <p className="text-base font-semibold text-ink">
            Ninguém no culto ainda
          </p>
          <p className="mt-2 text-sm text-muted">
            Busque acima para fazer o primeiro check-in.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {checkins.map((c) => (
            <li
              key={c.id}
              className="panel flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
            >
              <span className="font-mono text-lg leading-none text-muted">
                {c.displayId}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">
                {c.name}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted">
                <SexIcon sex={c.sex} className="h-3.5 w-3.5" />
                {c.age} anos
              </span>
              {c.status !== "present" ? <StatusBadge status={c.status} /> : null}

              {!closed ? (
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  {c.status === "present" ? (
                    <>
                      {waLink(c.guardianPhone, guardianMessage(c.name, c.guardianName)) ? (
                        <a
                          href={waLink(c.guardianPhone, guardianMessage(c.name, c.guardianName))!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Notificar responsável de ${c.name}`}
                          className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-grass transition-colors hover:border-grass"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                          <span className="sr-only">Notificar responsável</span>
                        </a>
                      ) : null}
                      <Button
                        size="sm"
                        variant="amber"
                        disabled={pending}
                        onClick={() => run(() => releaseCheckin(sessionId, c.id))}
                      >
                        <DoorOpen className="h-4 w-4" strokeWidth={2.5} /> Liberar
                      </Button>
                      <IconAction
                        title={`Remover check-in de ${c.name}`}
                        disabled={pending}
                        onClick={() => run(() => removeCheckin(sessionId, c.id))}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                      </IconAction>
                    </>
                  ) : (
                    <IconAction
                      title={`Desfazer liberação de ${c.name}`}
                      disabled={pending}
                      onClick={() => run(() => undoRelease(sessionId, c.id))}
                    >
                      <Undo2 className="h-4 w-4" strokeWidth={2.5} />
                    </IconAction>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <QuickCreateTeenModal
          onClose={() => {
            setCreateOpen(false);
            setQ("");
            setResults([]);
          }}
          initialName={term}
          action={quickCreateAndCheckin.bind(null, sessionId)}
        />
      ) : null}

      {notifyOpen ? (
        <NotifyGuardiansModal
          teens={presentTeens.map((c) => ({
            id: c.id,
            name: c.name,
            guardianName: c.guardianName,
            guardianPhone: c.guardianPhone,
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
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:text-ink disabled:opacity-50"
    >
      {children}
      <span className="sr-only">{title}</span>
    </button>
  );
}
