"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireRole } from "@/lib/auth";
import { sessionSchema } from "@/lib/validations";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

export async function createSession(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const unitId = ctx.profile.unit_id ?? ((formData.get("unit_id") as string) || null);
  if (!unitId) return { error: "Selecione a unidade." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      unit_id: unitId,
      session_date: parsed.data.session_date,
      service_id: parsed.data.service_id,
      notes: parsed.data.notes || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um culto nessa data e turno." };
    }
    return { error: "Não foi possível criar o culto." };
  }

  revalidatePath("/cultos");
  redirect(`/cultos/${data.id}`);
}

export async function updateSessionNotes(sessionId: string, notes: string) {
  await requireSession();
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({ notes: notes.trim() || null })
    .eq("id", sessionId);
  revalidatePath(`/cultos/${sessionId}`);
}

export async function deleteSession(sessionId: string) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", sessionId);
  revalidatePath("/cultos");
  redirect("/cultos");
}
