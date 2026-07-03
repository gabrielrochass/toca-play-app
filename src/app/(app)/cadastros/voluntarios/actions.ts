"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { volunteerSchema } from "@/lib/validations";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

function clean(v: FormDataEntryValue | null): string | null {
  const s = (v as string)?.trim();
  return s ? s : null;
}

function cleanSex(v: FormDataEntryValue | null): "M" | "F" | null {
  return v === "M" || v === "F" ? v : null;
}

/** FormData → validated object; `functions` comes from repeated checkbox fields. */
function parseVolunteer(formData: FormData) {
  return volunteerSchema.safeParse({
    ...Object.fromEntries(formData),
    functions: formData.getAll("functions"),
  });
}

export async function createVolunteer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireRole("unit_admin");
  const parsed = parseVolunteer(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const unitId = ctx.profile.unit_id ?? ((formData.get("unit_id") as string) || null);
  if (!unitId) return { error: "Selecione a unidade." };

  const supabase = await createClient();
  const { error } = await supabase.from("volunteers").insert({
    unit_id: unitId,
    name: parsed.data.name,
    phone: clean(formData.get("phone")),
    sex: cleanSex(formData.get("sex")),
    birthdate: clean(formData.get("birthdate")),
    functions: parsed.data.functions,
  });

  if (error) return { error: "Não foi possível salvar o voluntário." };

  revalidatePath("/cadastros/voluntarios");
  redirect("/cadastros/voluntarios");
}

export async function updateVolunteer(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("unit_admin");
  const parsed = parseVolunteer(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("volunteers")
    .update({
      name: parsed.data.name,
      phone: clean(formData.get("phone")),
      sex: cleanSex(formData.get("sex")),
      birthdate: clean(formData.get("birthdate")),
      functions: parsed.data.functions,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/cadastros/voluntarios");
  redirect("/cadastros/voluntarios");
}

export async function setVolunteerActive(id: string, isActive: boolean) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  await supabase.from("volunteers").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/cadastros/voluntarios");
}
