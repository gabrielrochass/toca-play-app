"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

const accountSchema = z
  .object({
    full_name: z.string().trim().min(2, "Informe seu nome"),
    email: z.string().trim().email("E-mail inválido"),
    // senha opcional — só troca se preenchida
    password: z.string().min(6, "Mínimo 6 caracteres").or(z.literal("")),
    confirm: z.string().or(z.literal("")),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

/** Saves name + (if changed) e-mail + (if provided) password in one go. */
export async function updateAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();

  const { error: nameErr } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", ctx.userId);
  if (nameErr) return { error: "Não foi possível salvar o nome." };

  const emailChanged = parsed.data.email.trim() !== (ctx.email ?? "").trim();
  if (emailChanged) {
    const { error } = await supabase.auth.updateUser({
      email: parsed.data.email,
    });
    if (error) return { error: "Não foi possível alterar o e-mail." };
  }

  if (parsed.data.password) {
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return { error: "Não foi possível alterar a senha." };
  }

  revalidatePath("/conta");
  return { ok: true };
}
