"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ROLE_LABELS } from "@/lib/utils";
import { defaultPassword } from "@/lib/naming";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { provisionUser } from "./actions";
import type { AppRole, Unit } from "@/types/database";

const ROLE_OPTIONS: { role: AppRole; label: string; desc: string }[] = [
  { role: "global_admin", label: "Admin geral", desc: "Vê e gerencia todas as unidades." },
  { role: "unit_admin", label: "Admin da unidade", desc: "Gerencia uma unidade (cadastros, config)." },
  { role: "volunteer", label: "Voluntário", desc: "Faz check-in e forma grupos." },
];

export function NewUserWizard({
  onClose,
  canCreateGlobal,
  units,
  actorUnitId,
}: {
  onClose: () => void;
  canCreateGlobal: boolean;
  units: Unit[];
  actorUnitId: string | null;
}) {
  const [state, formAction] = useActionState(provisionUser, EMPTY_FORM_STATE);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<AppRole | null>(null);
  const [unitId, setUnitId] = useState(actorUnitId ?? "");
  const [name, setName] = useState("");
  const fe = state.fieldErrors;

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  const roleOptions = ROLE_OPTIONS.filter(
    (o) => o.role !== "global_admin" || canCreateGlobal,
  );
  const needsUnitStep = canCreateGlobal && role !== null && role !== "global_admin";
  const chosenUnit = units.find((u) => u.id === unitId);

  function chooseRole(r: AppRole) {
    setRole(r);
    setStep(canCreateGlobal && r !== "global_admin" ? 2 : 3);
  }

  const pwPlaceholder = `Em branco = ${defaultPassword(name) || "primeironome123"}`;

  return (
    <Modal open onClose={onClose} title="Novo usuário">
      {step === 1 ? (
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-sm text-muted">Que tipo de usuário?</p>
          {roleOptions.map((o) => (
            <button
              key={o.role}
              type="button"
              onClick={() => chooseRole(o.role)}
              className="panel flex flex-col items-start gap-0.5 p-3 text-left transition-colors hover:border-orange"
            >
              <span className="font-semibold text-ink">{o.label}</span>
              <span className="text-sm text-muted">{o.desc}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-3">
          <BackButton onClick={() => setStep(1)} />
          <p className="text-sm text-muted">Em qual unidade?</p>
          <div className="flex flex-wrap gap-2">
            {units.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setUnitId(u.id);
                  setStep(3);
                }}
                className="rounded-md border border-night-600 px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-orange hover:text-ink"
              >
                {u.code} · {u.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="role" value={role ?? ""} />
          <input type="hidden" name="unit_id" value={needsUnitStep ? unitId : ""} />

          <div className="flex items-center justify-between gap-2">
            <BackButton onClick={() => setStep(needsUnitStep ? 2 : 1)} />
            <div className="flex flex-wrap justify-end gap-1.5">
              {role ? <Chip tone="night">{ROLE_LABELS[role]}</Chip> : null}
              {needsUnitStep && chosenUnit ? (
                <Chip tone="orange">{chosenUnit.code}</Chip>
              ) : null}
            </div>
          </div>

          <Field label="Nome completo" error={fe?.full_name}>
            <Input
              name="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="E-mail" error={fe?.email}>
            <Input type="email" name="email" autoComplete="off" required />
          </Field>
          <Field
            label="Senha provisória (opcional)"
            error={fe?.password}
            hint="Em branco, vira o primeiro nome + 123. O usuário pode trocar depois."
          >
            <Input
              name="password"
              type="text"
              autoComplete="off"
              placeholder={pwPlaceholder}
            />
          </Field>

          {state.error ? (
            <p className="text-sm font-medium text-redstone">{state.error}</p>
          ) : null}

          <SubmitButton variant="grass" pendingLabel="Criando…">
            Criar usuário
          </SubmitButton>
        </form>
      ) : null}
    </Modal>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
    >
      <ChevronLeft className="h-4 w-4" /> Voltar
    </button>
  );
}
