"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import type { Unit, Volunteer } from "@/types/database";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function VolunteerForm({
  action,
  volunteer,
  units,
  submitLabel,
}: {
  action: Action;
  volunteer?: Volunteer;
  units?: Unit[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {units ? (
        <Field label="Unidade" error={fe?.unit_id}>
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

      <Field label="Nome" error={fe?.name}>
        <Input name="name" defaultValue={volunteer?.name} required autoFocus />
      </Field>
      <Field label="Telefone" error={fe?.phone}>
        <PhoneInput name="phone" defaultValue={volunteer?.phone ?? ""} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sexo" error={fe?.sex} hint="Usado para liderar grupos">
          <Select name="sex" defaultValue={volunteer?.sex ?? ""}>
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </Select>
        </Field>
        <Field
          label="Data de nascimento"
          error={fe?.birthdate}
          hint="Para casar idade com o grupo"
        >
          <DatePicker
            name="birthdate"
            defaultValue={volunteer?.birthdate ?? undefined}
            placeholder="Escolher"
            dropdownYears={{ from: 1950, to: new Date().getFullYear() }}
          />
        </Field>
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
