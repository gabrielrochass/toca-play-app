"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireRole } from "@/lib/auth";
import { volunteerSchema } from "@/lib/validations";
import { parseTeenForm, insertTeenWithGuardians } from "@/lib/teens/persist";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function sessionInfo(supabase: Supabase, sessionId: string) {
  const { data } = await supabase
    .from("sessions")
    .select("unit_id, closed_at")
    .eq("id", sessionId)
    .maybeSingle();
  return data;
}

export async function addCheckin(
  sessionId: string,
  teenId: string,
  guardianId?: string | null,
): Promise<{ error?: string } | void> {
  const ctx = await requireSession();
  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session || session.closed_at) return;

  // The chosen responsável must belong to this teen (else store none).
  let gid: string | null = null;
  if (guardianId) {
    const { data: g } = await supabase
      .from("teen_guardians")
      .select("id")
      .eq("id", guardianId)
      .eq("teen_id", teenId)
      .maybeSingle();
    gid = g?.id ?? null;
  }

  const { error } = await supabase.from("checkins").insert({
    unit_id: session.unit_id,
    session_id: sessionId,
    teen_id: teenId,
    checked_in_by: ctx.userId,
    guardian_id: gid,
  });
  if (error) {
    // Two people scanning the same teen at once → unique (session_id, teen_id).
    if (error.code === "23505")
      return { error: "Este pré-adolescente já está no culto." };
    return { error: "Não foi possível fazer o check-in." };
  }
  revalidatePath(`/cultos/${sessionId}`);
}

/**
 * Full teen registration from inside a culto (same form/shape as the cadastros
 * page) + immediate check-in. Keeps data consistent regardless of entry point.
 */
export async function quickCreateAndCheckin(
  sessionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = parseTeenForm(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session) return { error: "Culto não encontrado." };
  if (session.closed_at) return { error: "O culto está encerrado." };

  const { id: teenId, error } = await insertTeenWithGuardians(
    supabase,
    session.unit_id,
    parsed.data,
  );
  if (error || !teenId) return { error: error ?? "Não foi possível cadastrar." };

  // Default today's responsável to the primary (first) guardian.
  const { data: primary } = await supabase
    .from("teen_guardians")
    .select("id")
    .eq("teen_id", teenId)
    .eq("is_primary", true)
    .maybeSingle();

  const { error: ciErr } = await supabase.from("checkins").insert({
    unit_id: session.unit_id,
    session_id: sessionId,
    teen_id: teenId,
    checked_in_by: ctx.userId,
    guardian_id: primary?.id ?? null,
  });
  if (ciErr && ciErr.code !== "23505")
    return { error: "Cadastrado, mas o check-in falhou. Tente pela busca." };

  revalidatePath(`/cultos/${sessionId}`);
  return { ok: true };
}

/** Release a teen (single step): mark as gone. Records who + when. */
export async function releaseCheckin(sessionId: string, checkinId: string) {
  const ctx = await requireSession();
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("checkins")
    .update({
      status: "left",
      authorized_at: now,
      authorized_by: ctx.userId,
      check_out_time: now,
    })
    .eq("id", checkinId);
  revalidatePath(`/cultos/${sessionId}`);
}

/** Undo a release — back to present. */
export async function undoRelease(sessionId: string, checkinId: string) {
  await requireSession();
  const supabase = await createClient();
  await supabase
    .from("checkins")
    .update({
      status: "present",
      authorized_at: null,
      authorized_by: null,
      check_out_time: null,
    })
    .eq("id", checkinId);
  revalidatePath(`/cultos/${sessionId}`);
}

export async function removeCheckin(sessionId: string, checkinId: string) {
  await requireSession();
  const supabase = await createClient();
  await supabase.from("checkins").delete().eq("id", checkinId);
  revalidatePath(`/cultos/${sessionId}`);
}

/** Close the culto — only allowed once every check-in has left. */
export async function closeSession(sessionId: string) {
  await requireSession();
  const supabase = await createClient();

  const { count: total } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  const { count: notLeft } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .neq("status", "left");

  if (!total) return; // nothing to close
  if (notLeft && notLeft > 0) return; // someone still inside — guarded in UI too

  await supabase
    .from("sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", sessionId);
  revalidatePath(`/cultos/${sessionId}`);
  revalidatePath("/cultos");
}

/** Reopen a closed culto — admin only. */
export async function reopenSession(sessionId: string) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  await supabase.from("sessions").update({ closed_at: null }).eq("id", sessionId);
  revalidatePath(`/cultos/${sessionId}`);
  revalidatePath("/cultos");
}

export async function toggleVolunteerAttendance(
  sessionId: string,
  volunteerId: string,
  present: boolean,
) {
  await requireSession();
  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session) return;

  const { data: existing } = await supabase
    .from("volunteer_attendance")
    .select("id")
    .eq("session_id", sessionId)
    .eq("volunteer_id", volunteerId)
    .maybeSingle();

  if (!existing && present) {
    // First time present this culto → pre-seed leads_group from the volunteer's
    // functions (a "pequenos grupos" volunteer leads by default).
    const { data: vol } = await supabase
      .from("volunteers")
      .select("functions")
      .eq("id", volunteerId)
      .maybeSingle();
    const leads = (vol?.functions ?? []).includes("pequenos_grupos");
    await supabase.from("volunteer_attendance").insert({
      unit_id: session.unit_id,
      session_id: sessionId,
      volunteer_id: volunteerId,
      present: true,
      leads_group: leads,
    });
  } else {
    // Toggle presence only — preserve any leads_group choice already made.
    await supabase
      .from("volunteer_attendance")
      .upsert(
        {
          unit_id: session.unit_id,
          session_id: sessionId,
          volunteer_id: volunteerId,
          present,
        },
        { onConflict: "session_id,volunteer_id" },
      );
  }
  revalidatePath(`/cultos/${sessionId}`);
}

/** Set which present volunteers lead a small group this culto. */
export async function setGroupLeaders(sessionId: string, leaderIds: string[]) {
  await requireSession();
  const supabase = await createClient();

  await supabase
    .from("volunteer_attendance")
    .update({ leads_group: false })
    .eq("session_id", sessionId);
  if (leaderIds.length) {
    await supabase
      .from("volunteer_attendance")
      .update({ leads_group: true })
      .eq("session_id", sessionId)
      .in("volunteer_id", leaderIds);
  }
  revalidatePath(`/cultos/${sessionId}/grupos`);
  revalidatePath(`/cultos/${sessionId}/voluntarios`);
}

/**
 * Full volunteer registration from inside a culto (same form as the cadastros
 * page: phone, sex, birthdate, functions) + mark present. leads_group is
 * pre-seeded from the "pequenos grupos" function.
 */
export async function quickCreateVolunteerFull(
  sessionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const parsed = volunteerSchema.safeParse({
    ...Object.fromEntries(formData),
    functions: formData.getAll("functions"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session) return { error: "Culto não encontrado." };

  const clean = (v: string) => (v.trim() ? v.trim() : null);
  const { data: vol, error } = await supabase
    .from("volunteers")
    .insert({
      unit_id: session.unit_id,
      name: parsed.data.name,
      phone: clean((formData.get("phone") as string) ?? ""),
      sex:
        parsed.data.sex === "M" || parsed.data.sex === "F"
          ? parsed.data.sex
          : null,
      birthdate: clean((formData.get("birthdate") as string) ?? ""),
      functions: parsed.data.functions,
    })
    .select("id")
    .single();
  if (error || !vol) return { error: "Não foi possível cadastrar o voluntário." };

  await supabase.from("volunteer_attendance").upsert(
    {
      unit_id: session.unit_id,
      session_id: sessionId,
      volunteer_id: vol.id,
      present: true,
      leads_group: parsed.data.functions.includes("pequenos_grupos"),
    },
    { onConflict: "session_id,volunteer_id" },
  );
  revalidatePath(`/cultos/${sessionId}`);
  return { ok: true };
}
