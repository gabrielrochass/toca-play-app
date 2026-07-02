"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function QuickCreateTeenModal({
  onClose,
  initialName,
  action,
}: {
  onClose: () => void;
  initialName: string;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Modal open onClose={onClose} title="Cadastrar e fazer check-in">
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Nome do pré-adolescente" error={fe?.name}>
          <Input name="name" defaultValue={initialName} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nascimento" error={fe?.birthdate}>
            <DatePicker
              name="birthdate"
              placeholder="Escolher"
              dropdownYears={{ from: 2005, to: new Date().getFullYear() }}
            />
          </Field>
          <Field label="Sexo" error={fe?.sex}>
            <Select name="sex" defaultValue="" required>
              <option value="" disabled>
                Selecione…
              </option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Select>
          </Field>
        </div>
        <Field label="Responsável" error={fe?.guardian_name}>
          <Input name="guardian_name" required />
        </Field>
        <Field label="Telefone do responsável" error={fe?.guardian_phone}>
          <PhoneInput name="guardian_phone" required />
        </Field>

        {state.error ? (
          <p className="text-sm font-medium text-redstone">{state.error}</p>
        ) : null}

        <SubmitButton variant="grass" pendingLabel="Cadastrando…">
          Cadastrar e fazer check-in
        </SubmitButton>
      </form>
    </Modal>
  );
}
