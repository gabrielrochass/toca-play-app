"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireRole } from "@/lib/auth";
import { teenSchema } from "@/lib/validations";
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

export async function addCheckin(sessionId: string, teenId: string) {
  const ctx = await requireSession();
  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session || session.closed_at) return;

  await supabase.from("checkins").insert({
    unit_id: session.unit_id,
    session_id: sessionId,
    teen_id: teenId,
    checked_in_by: ctx.userId,
  });
  revalidatePath(`/cultos/${sessionId}`);
}

/** Create a teen (in the culto's unit) and immediately check them in. */
export async function quickCreateAndCheckin(
  sessionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = teenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session) return { error: "Culto não encontrado." };
  if (session.closed_at) return { error: "O culto está encerrado." };

  const { data: teen, error: teenErr } = await supabase
    .from("teens")
    .insert({ unit_id: session.unit_id, ...parsed.data })
    .select("id")
    .single();
  if (teenErr || !teen) return { error: "Não foi possível cadastrar." };

  await supabase.from("checkins").insert({
    unit_id: session.unit_id,
    session_id: sessionId,
    teen_id: teen.id,
    checked_in_by: ctx.userId,
  });
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

  await supabase
    .from("volunteer_attendance")
    .upsert(
      { unit_id: session.unit_id, session_id: sessionId, volunteer_id: volunteerId, present },
      { onConflict: "session_id,volunteer_id" },
    );
  revalidatePath(`/cultos/${sessionId}`);
}

/** Create a volunteer (in the culto's unit) and mark present. */
export async function quickCreateVolunteer(sessionId: string, name: string) {
  await requireSession();
  const clean = name.trim();
  if (clean.length < 2) return;

  const supabase = await createClient();
  const session = await sessionInfo(supabase, sessionId);
  if (!session) return;

  const { data: vol } = await supabase
    .from("volunteers")
    .insert({ unit_id: session.unit_id, name: clean })
    .select("id")
    .single();
  if (!vol) return;

  await supabase.from("volunteer_attendance").upsert(
    { unit_id: session.unit_id, session_id: sessionId, volunteer_id: vol.id, present: true },
    { onConflict: "session_id,volunteer_id" },
  );
  revalidatePath(`/cultos/${sessionId}`);
}
