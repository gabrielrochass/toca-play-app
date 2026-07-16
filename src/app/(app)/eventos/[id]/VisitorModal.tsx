"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { maskPhoneBR } from "@/components/ui/PhoneInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Register a Visitante — someone at the event who belongs to no unit. Just
 * enough to identify and reach a responsável: name, sex, birthdate + guardian.
 */
export function VisitorModal({
  action,
  initialName = "",
  onClose,
}: {
  action: Action;
  initialName?: string;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Modal open onClose={onClose} title="Adicionar visitante">
      <form action={formAction} className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          Visitante não pertence a nenhuma unidade — fica registrado só neste evento.
        </p>

        <Field label="Nome do visitante" error={fe?.name} required>
          <Input name="name" defaultValue={initialName} placeholder="Ex: Pedro Henrique" required autoFocus />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data de nascimento" error={fe?.birthdate} required>
            <DatePicker
              name="birthdate"
              dropdownYears={{ from: 2005, to: new Date().getFullYear() }}
            />
          </Field>
          <Field label="Sexo" error={fe?.sex} required>
            <Select name="sex" defaultValue="" required>
              <option value="" disabled>
                Selecione…
              </option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Responsável" error={fe?.guardian_name} required>
            <Input name="guardian_name" placeholder="Ex: Maria Silva" required />
          </Field>
          <Field label="Telefone do responsável" error={fe?.guardian_phone} required>
            <Input
              name="guardian_phone"
              inputMode="tel"
              placeholder="Ex: (81) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
              required
            />
          </Field>
        </div>

        {state.error ? (
          <p className="text-sm font-medium text-redstone">{state.error}</p>
        ) : null}

        <SubmitButton variant="grass" pendingLabel="Salvando…" className="self-start">
          Adicionar e registrar presença
        </SubmitButton>
      </form>
    </Modal>
  );
}
