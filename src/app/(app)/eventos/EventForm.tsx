"use client";

import { useActionState, useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, Input } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import type { Unit } from "@/types/database";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

// Sentinel for the "all units" scope — mapped to null by eventSchema.
const ALL = "todas";

export function EventForm({
  action,
  units,
  defaultDate,
}: {
  action: Action;
  /** Units the user may scope an event to (own unit, or all for a global admin). */
  units: Unit[];
  defaultDate: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;
  const [scope, setScope] = useState<string>(ALL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Nome do evento" error={fe?.name} required>
        <Input name="name" placeholder="Ex: TocaPlay no Pátio" required autoFocus />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Data" error={fe?.event_date} required>
          <DatePicker name="event_date" defaultValue={defaultDate} />
        </Field>
        <Field label="Horário" error={fe?.start_time} optional>
          <TimePicker name="start_time" />
        </Field>
      </div>

      <Field label="Local" error={fe?.location} optional>
        <Input name="location" placeholder="Ex: Pátio da Igreja A Ponte" />
      </Field>

      <Field label="Observações" error={fe?.notes} optional>
        <textarea
          name="notes"
          rows={3}
          className="mc-input resize-y"
          placeholder="Algo importante sobre este evento…"
        />
      </Field>

      <Field label="Para qual unidade?" error={fe?.unit_id} required>
        <input type="hidden" name="unit_id" value={scope} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope(ALL)}
            aria-pressed={scope === ALL}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
              scope === ALL
                ? "border-orange/60 bg-orange/15 text-orange"
                : "border-night-600 text-muted hover:text-ink",
            )}
          >
            <Globe className="h-4 w-4" /> Todas as unidades
          </button>
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setScope(u.id)}
              aria-pressed={scope === u.id}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                scope === u.id
                  ? "border-grass-dark bg-grass/15 text-grass"
                  : "border-night-600 text-muted hover:text-ink",
              )}
            >
              {u.code} · {u.name}
            </button>
          ))}
        </div>
      </Field>

      {state.error ? (
        <p className="text-sm font-medium text-redstone">{state.error}</p>
      ) : null}

      <SubmitButton variant="grass" pendingLabel="Criando…" className="mt-1">
        Criar evento
      </SubmitButton>
    </form>
  );
}
