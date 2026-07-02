"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import type { Teen, Unit } from "@/types/database";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function TeenForm({
  action,
  teen,
  units,
  submitLabel,
}: {
  action: Action;
  teen?: Teen;
  units?: Unit[]; // provided only when the user must choose a unit (global admin)
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {units ? (
        <Field label="Unidade" error={fe?.unit_id}>
          <Select name="unit_id" defaultValue={teen?.unit_id ?? ""} required>
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

      <Field label="Nome do pré-adolescente" error={fe?.name}>
        <Input name="name" defaultValue={teen?.name} required autoFocus />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data de nascimento" error={fe?.birthdate}>
          <DatePicker
            name="birthdate"
            defaultValue={teen?.birthdate}
            placeholder="Escolher"
            dropdownYears={{ from: 2005, to: new Date().getFullYear() }}
          />
        </Field>
        <Field label="Sexo" error={fe?.sex}>
          <Select name="sex" defaultValue={teen?.sex ?? ""} required>
            <option value="" disabled>
              Selecione…
            </option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </Select>
        </Field>
      </div>

      <Field label="Responsável" error={fe?.guardian_name}>
        <Input
          name="guardian_name"
          defaultValue={teen?.guardian_name}
          required
        />
      </Field>
      <Field label="Telefone do responsável" error={fe?.guardian_phone}>
        <PhoneInput
          name="guardian_phone"
          defaultValue={teen?.guardian_phone}
          required
        />
      </Field>

      {state.error ? (
        <p className="text-sm font-medium text-redstone">{state.error}</p>
      ) : null}

      <SubmitButton variant="grass" className="mt-1">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
