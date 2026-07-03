"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PRODUCT_CATEGORIES } from "@/lib/utils";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/forms";
import type { Unit } from "@/types/database";
import type { ProductRow } from "./StockView";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ProductFormModal({
  title,
  action,
  product,
  units,
  withInitialQuantity,
  onClose,
}: {
  title: string;
  action: Action;
  product?: ProductRow;
  units?: Unit[];
  withInitialQuantity?: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const fe = state.fieldErrors;

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Modal open onClose={onClose} title={title}>
      <form action={formAction} className="flex flex-col gap-4">
        {units ? (
          <Field label="Unidade" error={fe?.unit_id} required>
            <Select name="unit_id" defaultValue="" required>
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

        <Field label="Nome do produto" error={fe?.name} required>
          <Input
            name="name"
            defaultValue={product?.name}
            placeholder="Ex: Bola de Ping Pong"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoria" error={fe?.category} required>
            <Select name="category" defaultValue={product?.category ?? ""} required>
              <option value="" disabled>
                Selecione…
              </option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unidade de medida" error={fe?.unit_label} required>
            <Input
              name="unit_label"
              defaultValue={product?.unit_label ?? "un"}
              placeholder="Ex: un, kg, cx"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {withInitialQuantity ? (
            <Field
              label="Quantidade inicial"
              error={fe?.quantity}
              optional
              hint="Quanto já tem em estoque"
            >
              <Input name="quantity" type="number" min={0} defaultValue={0} />
            </Field>
          ) : null}
          <Field
            label="Quantidade mínima"
            error={fe?.min_quantity}
            required
            hint="Alerta abaixo disso"
          >
            <Input
              name="min_quantity"
              type="number"
              min={0}
              defaultValue={product?.min_quantity ?? 0}
            />
          </Field>
        </div>

        {state.error ? (
          <p className="text-sm font-medium text-redstone">{state.error}</p>
        ) : null}

        <SubmitButton variant="grass">Salvar</SubmitButton>
      </form>
    </Modal>
  );
}
