"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Check, HeartHandshake, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { toggleVolunteerAttendance, quickCreateVolunteer } from "../actions";

interface Row {
  id: string;
  name: string;
  present: boolean;
  canLead: boolean;
}

export function AttendanceList({
  sessionId,
  volunteers,
}: {
  sessionId: string;
  volunteers: Row[];
}) {
  const [rows, setPresent] = useOptimistic(
    volunteers,
    (state: Row[], update: { id: string; present: boolean }) =>
      state.map((r) => (r.id === update.id ? { ...r, present: update.present } : r)),
  );
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");

  const presentCount = rows.filter((r) => r.present).length;
  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (term ? rows.filter((r) => r.name.toLowerCase().includes(term)) : rows),
    [rows, term],
  );

  function toggle(row: Row) {
    const next = !row.present;
    startTransition(async () => {
      setPresent({ id: row.id, present: next });
      await toggleVolunteerAttendance(sessionId, row.id, next);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <HeartHandshake className="h-4 w-4 text-grass" />
        <span>
          <span className="font-mono text-lg text-grass">{presentCount}</span> de{" "}
          {rows.length} presentes
        </span>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar voluntário para marcar presença"
          className="pl-icon"
          aria-label="Buscar voluntário"
        />
      </div>

      {filtered.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => toggle(r)}
                aria-pressed={r.present}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                  r.present
                    ? "border-grass-dark bg-grass/15"
                    : "border-night-700 bg-night-850 hover:border-night-600",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded border",
                    r.present
                      ? "border-grass-dark bg-grass text-[#10240a]"
                      : "border-night-600 bg-night-950 text-transparent",
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {r.name}
                  {!r.canLead ? (
                    <span
                      className="ml-2 text-xs font-normal text-muted"
                      title="Cadastre sexo e nascimento para liderar grupos"
                    >
                      (sem sexo/idade)
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="block-flat flex flex-col items-start gap-2 p-4">
          <p className="text-sm text-muted">
            {volunteers.length === 0
              ? "Nenhum voluntário cadastrado nesta unidade."
              : `Nenhum voluntário encontrado com “${q.trim()}”.`}
          </p>
          {term ? (
            <Button
              size="sm"
              variant="gold"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await quickCreateVolunteer(sessionId, q.trim());
                  setQ("");
                })
              }
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.5} /> Cadastrar “
              {q.trim()}” e marcar presente
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
