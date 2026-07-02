"use client";

import { useState, useTransition } from "react";
import { NotebookPen, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateSessionNotes } from "../actions";

export function NotesEditor({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateSessionNotes(sessionId, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="block-flat p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-muted hover:text-ink"
      >
        <NotebookPen className="h-4 w-4" />
        Observações do culto
        {!open && notes ? (
          <span className="ml-auto truncate text-xs text-muted">{notes}</span>
        ) : null}
      </button>

      {open ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mc-input resize-y"
            placeholder="Registre algo importante deste culto…"
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="gold"
              onClick={save}
              disabled={pending}
            >
              {pending ? "Salvando…" : "Salvar observações"}
            </Button>
            {saved ? (
              <span className="flex items-center gap-1 text-xs text-grass">
                <Check className="h-3.5 w-3.5" /> Salvo
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
