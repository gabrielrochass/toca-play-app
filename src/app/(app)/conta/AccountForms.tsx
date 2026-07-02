"use client";

import { useActionState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import { updateProfileName, updateEmail, updatePassword } from "./actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function Status({ state, okMsg }: { state: FormState; okMsg: string }) {
  if (state.error)
    return <p className="text-sm font-medium text-redstone">{state.error}</p>;
  if (state.ok)
    return <p className="text-sm font-medium text-grass">{okMsg}</p>;
  return null;
}

function useAction(action: Action) {
  return useActionState(action, EMPTY_FORM_STATE);
}

export function AccountForms({
  initialName,
  currentEmail,
}: {
  initialName: string;
  currentEmail: string;
}) {
  const [nameState, nameAction] = useAction(updateProfileName);
  const [emailState, emailAction] = useAction(updateEmail);
  const [pwState, pwAction] = useAction(updatePassword);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle className="mb-4">Perfil</CardTitle>
        <form action={nameAction} className="flex flex-col gap-4">
          <Field label="Nome" error={nameState.fieldErrors?.full_name}>
            <Input name="full_name" defaultValue={initialName} required />
          </Field>
          <Status state={nameState} okMsg="Nome atualizado!" />
          <SubmitButton variant="grass">Salvar nome</SubmitButton>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-4">E-mail</CardTitle>
        <form action={emailAction} className="flex flex-col gap-4">
          <Field
            label="E-mail de acesso"
            error={emailState.fieldErrors?.email}
            hint="Você receberá um e-mail para confirmar a troca."
          >
            <Input
              type="email"
              name="email"
              defaultValue={currentEmail}
              required
            />
          </Field>
          <Status
            state={emailState}
            okMsg="Confirme pelo link enviado ao novo e-mail."
          />
          <SubmitButton variant="grass">Alterar e-mail</SubmitButton>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <CardTitle className="mb-4">Senha</CardTitle>
        <form action={pwAction} className="flex max-w-md flex-col gap-4">
          <Field label="Nova senha" error={pwState.fieldErrors?.password}>
            <Input type="password" name="password" autoComplete="new-password" required />
          </Field>
          <Field label="Confirmar senha" error={pwState.fieldErrors?.confirm}>
            <Input
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
            />
          </Field>
          <Status state={pwState} okMsg="Senha alterada!" />
          <SubmitButton variant="grass">Alterar senha</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
