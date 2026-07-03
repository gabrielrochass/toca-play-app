"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, Input, Select } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { maskPhoneBR } from "@/components/ui/PhoneInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import type { Teen, Unit } from "@/types/database";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface GuardianDraft {
  name: string;
  phone: string;
  relationship: string;
}

const EMPTY_GUARDIAN: GuardianDraft = { name: "", phone: "", relationship: "" };

export function TeenForm({
  action,
  teen,
  guardians: initialGuardians,
  units,
  submitLabel,
  variant = "page",
  initialName,
  onSuccess,
}: {
  action: Action;
  teen?: Teen;
  guardians?: GuardianDraft[];
  units?: Unit[]; // provided only when the user must choose a unit (global admin)
  submitLabel: string;
  /** "page" spreads across the screen; "modal" stays a single column. */
  variant?: "page" | "modal";
  initialName?: string;
  /** Called when the action returns { ok } (used to close a modal). */
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state, onSuccess]);

  const [guardians, setGuardians] = useState<GuardianDraft[]>(
    initialGuardians?.length
      ? initialGuardians
      : teen
        ? [{ name: teen.guardian_name, phone: teen.guardian_phone, relationship: "" }]
        : [{ ...EMPTY_GUARDIAN }],
  );

  const [address, setAddress] = useState({
    cep: teen?.cep ?? "",
    street: teen?.street ?? "",
    neighborhood: teen?.neighborhood ?? "",
    city: teen?.city ?? "",
    state: teen?.state ?? "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  function setGuardian(i: number, patch: Partial<GuardianDraft>) {
    setGuardians((gs) => gs.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }
  function addGuardian() {
    setGuardians((gs) => (gs.length >= 6 ? gs : [...gs, { ...EMPTY_GUARDIAN }]));
  }
  function removeGuardian(i: number) {
    setGuardians((gs) => (gs.length <= 1 ? gs : gs.filter((_, idx) => idx !== i)));
  }

  async function lookupCep() {
    const digits = address.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado.");
        return;
      }
      setAddress((a) => ({
        ...a,
        street: data.logradouro || a.street,
        neighborhood: data.bairro || a.neighborhood,
        city: data.localidade || a.city,
        state: data.uf || a.state,
      }));
    } catch {
      setCepError("Não foi possível buscar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* guardians serialized as JSON — index 0 is the primary responsável.
          Empty extra rows are dropped so a blank "Adicionar" never blocks submit. */}
      <input
        type="hidden"
        name="guardians"
        value={JSON.stringify(
          guardians.filter(
            (g, i) => i === 0 || g.name.trim() !== "" || g.phone.trim() !== "",
          ),
        )}
      />

      {/* Dados ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4">
        {units ? (
          <Field label="Unidade" error={fe?.unit_id} required>
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

        <Field label="Nome do pré-adolescente" error={fe?.name} required>
          <Input
            name="name"
            defaultValue={teen?.name ?? initialName}
            placeholder="Ex: Ana Beatriz Souza"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data de nascimento" error={fe?.birthdate} required>
            <DatePicker
              name="birthdate"
              defaultValue={teen?.birthdate}
              placeholder="Escolher data"
              dropdownYears={{ from: 2005, to: new Date().getFullYear() }}
            />
          </Field>
          <Field label="Sexo" error={fe?.sex} required>
            <Select name="sex" defaultValue={teen?.sex ?? ""} required>
              <option value="" disabled>
                Selecione…
              </option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Select>
          </Field>
        </div>
      </div>

      {/* Responsáveis + Endereço (lado a lado na página) ------------------- */}
      <div
        className={cn(
          "grid gap-x-8 gap-y-6",
          variant === "page" && "lg:grid-cols-2",
        )}
      >
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Responsáveis</span>
            <button
              type="button"
              onClick={addGuardian}
              disabled={guardians.length >= 6}
              className="flex items-center gap-1 text-xs font-semibold text-orange transition-colors hover:text-orange-dark disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Adicionar
            </button>
          </div>

          {guardians.map((g, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Responsável {i + 1}
                </span>
                {i > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeGuardian(i)}
                    aria-label={`Remover responsável ${i + 1}`}
                    className="text-muted transition-colors hover:text-redstone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <Field label="Nome" required={i === 0}>
                <Input
                  placeholder="Ex: Maria Silva"
                  value={g.name}
                  onChange={(e) => setGuardian(i, { name: e.target.value })}
                  required={i === 0}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Telefone" required={i === 0}>
                  <Input
                    inputMode="tel"
                    placeholder="Ex: (81) 99999-9999"
                    value={g.phone}
                    onChange={(e) =>
                      setGuardian(i, { phone: maskPhoneBR(e.target.value) })
                    }
                    required={i === 0}
                  />
                </Field>
                <Field label="Parentesco" optional>
                  <Input
                    placeholder="Ex: mãe"
                    value={g.relationship}
                    onChange={(e) =>
                      setGuardian(i, { relationship: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          {fe?.guardians?.length ? (
            <span className="text-xs font-medium text-redstone">
              {fe.guardians[0]}
            </span>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <span className="eyebrow">
            Endereço <span className="font-normal normal-case">(opcional)</span>
          </span>
          <div>
            <span className="mb-1.5 block font-sans text-sm font-medium text-muted">
              CEP
            </span>
            <div className="flex items-stretch gap-2">
              <Input
                name="cep"
                inputMode="numeric"
                placeholder="00000-000"
                className="flex-1"
                value={address.cep}
                onChange={(e) => setAddress((a) => ({ ...a, cep: e.target.value }))}
                onBlur={lookupCep}
              />
              <button
                type="button"
                onClick={lookupCep}
                disabled={cepLoading}
                className="mc-btn mc-btn-sm shrink-0"
              >
                {cepLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </button>
            </div>
            {cepError ? (
              <span className="mt-1 block text-xs font-medium text-redstone">
                {cepError}
              </span>
            ) : null}
          </div>
          <Field label="Rua">
            <Input
              name="street"
              placeholder="Ex: Rua das Flores, 123"
              value={address.street}
              onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            />
          </Field>
          <Field label="Bairro">
            <Input
              name="neighborhood"
              placeholder="Ex: Casa Forte"
              value={address.neighborhood}
              onChange={(e) =>
                setAddress((a) => ({ ...a, neighborhood: e.target.value }))
              }
            />
          </Field>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field label="Cidade">
              <Input
                name="city"
                placeholder="Ex: Recife"
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              />
            </Field>
            <Field label="UF">
              <Input
                name="state"
                placeholder="PE"
                maxLength={2}
                className="text-center uppercase"
                value={address.state}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, state: e.target.value.toUpperCase() }))
                }
              />
            </Field>
          </div>
        </section>
      </div>

      {/* Observações ------------------------------------------------------- */}
      <Field label="Observações" error={fe?.observations} optional>
        <textarea
          name="observations"
          defaultValue={teen?.observations ?? ""}
          rows={3}
          placeholder="Ex: alergia a amendoim, usa óculos, chega sempre atrasado"
          className="mc-input resize-y"
        />
      </Field>

      {state.error ? (
        <p className="text-sm font-medium text-redstone">{state.error}</p>
      ) : null}

      <SubmitButton variant="grass" className="self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
