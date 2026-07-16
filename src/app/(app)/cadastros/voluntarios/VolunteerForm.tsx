"use client";

import { useActionState, useEffect } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import { VOLUNTEER_FUNCTIONS, VOLUNTEER_FUNCTION_LABELS } from "@/lib/utils";
import type { Unit, Volunteer } from "@/types/database";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function VolunteerForm({
  action,
  volunteer,
  units,
  submitLabel,
  initialName,
  onSuccess,
}: {
  action: Action;
  volunteer?: Volunteer;
  units?: Unit[];
  submitLabel: string;
  initialName?: string;
  /** Called when the action returns { ok } (used to close a modal). */
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {units ? (
        <Field label="Unidade" error={fe?.unit_id} required>
          <Select name="unit_id" defaultValue={volunteer?.unit_id ?? ""} required>
            <option value="" disabled>
              Selecione…
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="Nome" error={fe?.name} required>
        <Input
          name="name"
          defaultValue={volunteer?.name ?? initialName}
          placeholder="Ex: João Pedro"
          required
          autoFocus
        />
      </Field>
      <Field label="Telefone" error={fe?.phone} optional>
        <PhoneInput name="phone" defaultValue={volunteer?.phone ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sexo" error={fe?.sex} optional hint="Usado para liderar grupos">
          <Select name="sex" defaultValue={volunteer?.sex ?? ""}>
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </Select>
        </Field>
        <Field
          label="Data de nascimento"
          error={fe?.birthdate}
          optional
          hint="Para casar idade com o grupo"
        >
          <DatePicker
            name="birthdate"
            defaultValue={volunteer?.birthdate ?? undefined}
            dropdownYears={{ from: 1950, to: new Date().getFullYear() }}
          />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block font-sans text-sm font-medium text-muted">
          Funções
          <span className="ml-1 text-xs font-normal text-muted/70">(opcional)</span>
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VOLUNTEER_FUNCTIONS.map((f) => (
            <label
              key={f}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-night-700 bg-night-950 px-3 py-2 text-sm text-ink transition-colors hover:border-night-600"
            >
              <input
                type="checkbox"
                name="functions"
                value={f}
                defaultChecked={volunteer?.functions?.includes(f)}
                className="h-4 w-4 accent-grass"
              />
              {VOLUNTEER_FUNCTION_LABELS[f]}
            </label>
          ))}
        </div>
        <span className="mt-1 block text-xs text-muted">
          Quem tem “Pequenos grupos” já vem marcado como líder nos cultos.
        </span>
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-redstone">{state.error}</p>
      ) : null}

      <SubmitButton variant="grass" className="mt-1">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
