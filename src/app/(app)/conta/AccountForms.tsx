"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { updateAccount } from "./actions";

export function AccountForms({
  initialName,
  currentEmail,
}: {
  initialName: string;
  currentEmail: string;
}) {
  const [state, formAction] = useActionState(updateAccount, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  return (
    <Card className="max-w-xl">
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Nome" error={fe?.full_name} required>
          <Input name="full_name" defaultValue={initialName} required />
        </Field>

        <Field
          label="E-mail de acesso"
          error={fe?.email}
          required
          hint="Se mudar, você receberá um e-mail para confirmar."
        >
          <Input type="email" name="email" defaultValue={currentEmail} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nova senha"
            error={fe?.password}
            optional
            hint="Deixe em branco para manter."
          >
            <PasswordInput
              name="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </Field>
          <Field label="Confirmar senha" error={fe?.confirm} optional>
            <PasswordInput name="confirm" autoComplete="new-password" />
          </Field>
        </div>

        {state.error ? (
          <p className="text-sm font-medium text-redstone">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm font-medium text-grass">
            Alterações salvas!
          </p>
        ) : null}

        <SubmitButton variant="grass" className="self-start">
          Salvar alterações
        </SubmitButton>
      </form>
    </Card>
  );
}
