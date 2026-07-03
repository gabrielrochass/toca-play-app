"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import {
  parseTeenForm,
  teenRow,
  insertTeenWithGuardians,
  replaceGuardians,
} from "@/lib/teens/persist";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

function resolveUnitId(
  profileUnitId: string | null,
  formData: FormData,
): string | null {
  return profileUnitId ?? ((formData.get("unit_id") as string) || null);
}

export async function createTeen(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = parseTeenForm(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const unitId = resolveUnitId(ctx.profile.unit_id, formData);
  if (!unitId) return { error: "Selecione a unidade." };

  const supabase = await createClient();
  const { error } = await insertTeenWithGuardians(supabase, unitId, parsed.data);
  if (error) return { error };

  revalidatePath("/cadastros/pre-adolescentes");
  redirect("/cadastros/pre-adolescentes");
}

export async function updateTeen(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const parsed = parseTeenForm(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("teens")
    .select("unit_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Cadastro não encontrado." };

  const { error } = await supabase
    .from("teens")
    .update(teenRow(parsed.data))
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar as alterações." };

  const { error: gErr } = await replaceGuardians(
    supabase,
    existing.unit_id,
    id,
    parsed.data,
  );
  if (gErr) return { error: gErr };

  revalidatePath("/cadastros/pre-adolescentes");
  redirect("/cadastros/pre-adolescentes");
}

export async function setTeenActive(id: string, isActive: boolean) {
  await requireSession();
  const supabase = await createClient();
  await supabase.from("teens").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/cadastros/pre-adolescentes");
}
