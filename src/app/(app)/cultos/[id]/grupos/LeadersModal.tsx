"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { setGroupLeaders } from "../actions";
import type { LeaderRow } from "./GroupsBoard";

export function LeadersModal({
  sessionId,
  leaders,
  onClose,
  afterSave,
  confirmLabel = "Salvar líderes",
  intro,
}: {
  sessionId: string;
  leaders: LeaderRow[];
  onClose: () => void;
  /** Runs after leaders are saved (e.g. generate groups). */
  afterSave?: () => void | Promise<void>;
  confirmLabel?: string;
  intro?: string;
}) {
  // "Pequenos grupos" volunteers are always pre-marked as leaders.
  const [checked, setChecked] = useState<Set<string>>(
    () =>
      new Set(
        leaders.filter((l) => l.leads || l.isPequenosGrupos).map((l) => l.id),
      ),
  );
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    start(async () => {
      await setGroupLeaders(sessionId, [...checked]);
      await afterSave?.();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Líderes deste culto">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {intro ??
            "Marque quem vai liderar um pequeno grupo hoje. Quem tem a função “Pequenos grupos” já vem marcado."}
        </p>

        {leaders.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum voluntário presente. Marque presença na aba Voluntários.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {leaders.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => l.canLead && toggle(l.id)}
                  aria-pressed={checked.has(l.id)}
                  disabled={!l.canLead}
                  title={
                    l.canLead
                      ? undefined
                      : "Cadastre sexo e nascimento para liderar grupos"
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                    !l.canLead
                      ? "cursor-not-allowed border-night-800 opacity-50"
                      : checked.has(l.id)
                        ? "border-grass-dark bg-grass/15"
                        : "border-night-700 bg-night-850 hover:border-night-600",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded border",
                      checked.has(l.id)
                        ? "border-grass-dark bg-grass text-[#10240a]"
                        : "border-night-600 bg-night-950 text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {l.name}
                  </span>
                  {l.isPequenosGrupos ? (
                    <Chip tone="orange">Pequenos grupos</Chip>
                  ) : null}
                  {!l.canLead ? (
                    <span className="text-xs text-muted">sem sexo/idade</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" variant="grass" onClick={save} disabled={pending}>
            {pending ? "Salvando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
