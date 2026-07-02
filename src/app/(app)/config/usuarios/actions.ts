"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { provisionUserSchema } from "@/lib/validations";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { defaultPassword } from "@/lib/naming";
import type { AppRole } from "@/types/database";

export async function provisionUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireRole("unit_admin");
  const parsed = provisionUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { email, full_name, role } = parsed.data;
  let unit_id = parsed.data.unit_id;
  // Blank password → default from first name (nome123).
  const password = parsed.data.password?.trim() || defaultPassword(full_name);

  // A unit admin can only create volunteers/unit admins inside their own unit.
  if (ctx.profile.role !== "global_admin") {
    if (role === "global_admin") {
      return { error: "Você não pode criar administrador geral." };
    }
    unit_id = ctx.profile.unit_id;
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createErr || !created?.user) {
    const already = createErr?.message?.toLowerCase().includes("already");
    return {
      error: already
        ? "Já existe um usuário com esse e-mail."
        : "Não foi possível criar o usuário.",
    };
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    unit_id,
    role,
    full_name,
  });

  if (profErr) {
    // Roll back the orphaned auth user so email stays reusable.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível vincular o usuário à unidade." };
  }

  revalidatePath("/config/usuarios");
  return { ok: true };
}

export async function updateUserProfile(
  id: string,
  fullName: string,
  role: AppRole,
) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  // RLS scopes to the actor's unit; the DB trigger blocks granting global_admin
  // unless the actor is a global admin.
  await supabase
    .from("profiles")
    .update({ full_name: fullName.trim(), role })
    .eq("id", id);
  revalidatePath("/config/usuarios");
}

export async function setUserActive(id: string, isActive: boolean) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/config/usuarios");
}

/** Reset a user's password to the default (nome123). Actor must see the user (RLS). */
export async function resetUserPassword(id: string) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();
  if (!target) return; // out of scope

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, {
    password: defaultPassword(target.full_name),
  });
}
