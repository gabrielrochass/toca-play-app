"use client";

import { useActionState, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import type { Unit, UnitService } from "@/types/database";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function SessionForm({
  action,
  units,
  services,
  defaultUnitId,
  defaultDate,
}: {
  action: Action;
  units?: Unit[]; // only for global admin (must choose a unit)
  services: UnitService[]; // all services the user can see
  defaultUnitId?: string | null;
  defaultDate: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  const [unitId, setUnitId] = useState(defaultUnitId ?? units?.[0]?.id ?? "");
  const [serviceId, setServiceId] = useState("");

  const unitServices = useMemo(
    () =>
      services
        .filter((s) => s.unit_id === unitId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [services, unitId],
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {units ? (
        <Field label="Unidade" error={fe?.unit_id} required>
          <input type="hidden" name="unit_id" value={unitId} />
          <div className="flex flex-wrap gap-2">
            {units.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setUnitId(u.id);
                  setServiceId("");
                }}
                aria-pressed={unitId === u.id}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                  unitId === u.id
                    ? "border-grass-dark bg-grass/15 text-grass"
                    : "border-night-600 text-muted hover:text-ink",
                )}
              >
                {u.code} · {u.name}
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      <Field label="Data do culto" error={fe?.session_date} required>
        <DatePicker name="session_date" defaultValue={defaultDate} />
      </Field>

      <Field label="Horário do culto" error={fe?.service_id} required>
        <input type="hidden" name="service_id" value={serviceId} />
        {unitServices.length ? (
          <div className="flex flex-wrap gap-2">
            {unitServices.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                aria-pressed={serviceId === s.id}
                className={cn(
                  "min-w-16 rounded-md border px-4 py-2.5 text-center font-semibold transition-colors",
                  serviceId === s.id
                    ? "border-orange/60 bg-orange/15 text-orange"
                    : "border-night-600 text-muted hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Nenhum horário configurado para esta unidade.
          </p>
        )}
      </Field>

      <Field label="Observações" error={fe?.notes} optional>
        <textarea
          name="notes"
          rows={3}
          className="mc-input resize-y"
          placeholder="Algo importante sobre este culto…"
        />
      </Field>

      {state.error ? (
        <p className="text-sm font-medium text-redstone">{state.error}</p>
      ) : null}

      <SubmitButton variant="grass" pendingLabel="Abrindo…" className="mt-1">
        Abrir culto
      </SubmitButton>
    </form>
  );
}
