"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession, requireRole, isGlobalAdmin } from "@/lib/auth";
import { eventSchema, visitorSchema } from "@/lib/validations";
import { parseTeenForm } from "@/lib/teens/persist";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function eventInfo(supabase: Supabase, eventId: string) {
  const { data } = await supabase
    .from("events")
    .select("unit_id, closed_at")
    .eq("id", eventId)
    .maybeSingle();
  return data;
}

/**
 * Create an event scoped to all units (unit_id null = "Todas") or one unit.
 * Any volunteer may create; a unit volunteer can only pick "Todas" or their own
 * unit (RLS enforces it too — this is just the friendly guard).
 */
export async function createEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { name, event_date, start_time, location, notes, unit_id } = parsed.data;

  // A unit user may only create a "Todas" event or one in their own unit.
  if (!isGlobalAdmin(ctx) && unit_id && unit_id !== ctx.profile.unit_id) {
    return { error: "Você só pode criar eventos para a sua unidade ou para todas." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      unit_id,
      name,
      event_date,
      start_time: start_time || null,
      location: location || null,
      notes: notes || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar o evento." };

  revalidatePath("/eventos");
  redirect(`/eventos/${data.id}`);
}

/** Check in a teen who is already registered (found via search_event_teens). */
export async function addEventCheckin(
  eventId: string,
  teenId: string,
  unitId: string,
): Promise<{ error?: string } | void> {
  const ctx = await requireSession();
  const supabase = await createClient();
  const ev = await eventInfo(supabase, eventId);
  if (!ev || ev.closed_at) return;

  const { error } = await supabase.from("event_checkins").insert({
    event_id: eventId,
    unit_id: unitId,
    teen_id: teenId,
    checked_in_by: ctx.userId,
  });
  if (error) {
    // Two people checking in the same teen at once → unique (event_id, teen_id).
    if (error.code === "23505")
      return { error: "Este pré-adolescente já está no evento." };
    return { error: "Não foi possível fazer o check-in." };
  }
  revalidatePath(`/eventos/${eventId}`);
}

/**
 * Register a BRAND-NEW teen into a unit AND check them into the event,
 * atomically, via the security-definer RPC (lets any volunteer at a "Todas"
 * event route a teen to any unit). The teen becomes a real, complete teen of
 * that unit (address + observations included, like the cadastros page).
 */
export async function registerEventTeen(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const parsed = parseTeenForm(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const ev = await eventInfo(supabase, eventId);
  if (!ev) return { error: "Evento não encontrado." };
  if (ev.closed_at) return { error: "O evento está encerrado." };

  // On a unit-scoped event the unit is fixed to the event's (the client value
  // is ignored — no cross-unit injection); a "Todas" event lets the operator
  // choose. The RPC re-validates this too.
  const unitId = ev.unit_id ?? ((formData.get("unit_id") as string) || "");
  if (!unitId) return { error: "Selecione a unidade do pré-adolescente." };

  const d = parsed.data;
  const { error } = await supabase.rpc("register_event_teen", {
    p_event: eventId,
    p_unit: unitId,
    p_name: d.name,
    p_birthdate: d.birthdate,
    p_sex: d.sex,
    p_guardians: d.guardians.map((g) => ({
      name: g.name,
      phone: g.phone,
      relationship: g.relationship || null,
    })),
    p_cep: d.cep || null,
    p_street: d.street || null,
    p_neighborhood: d.neighborhood || null,
    p_city: d.city || null,
    p_state: d.state || null,
    p_observations: d.observations || null,
  });
  if (error) return { error: "Não foi possível cadastrar e fazer o check-in." };

  revalidatePath(`/eventos/${eventId}`);
  return { ok: true };
}

/** Add a Visitante (no unit) + check them into the event. */
export async function addEventVisitor(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = visitorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const ev = await eventInfo(supabase, eventId);
  if (!ev) return { error: "Evento não encontrado." };
  if (ev.closed_at) return { error: "O evento está encerrado." };

  const { data: visitor, error } = await supabase
    .from("event_visitors")
    .insert({
      event_id: eventId,
      name: parsed.data.name,
      sex: parsed.data.sex,
      birthdate: parsed.data.birthdate,
      guardian_name: parsed.data.guardian_name,
      guardian_phone: parsed.data.guardian_phone,
    })
    .select("id")
    .single();
  if (error || !visitor) return { error: "Não foi possível salvar o visitante." };

  const { error: ciErr } = await supabase.from("event_checkins").insert({
    event_id: eventId,
    visitor_id: visitor.id,
    checked_in_by: ctx.userId,
  });
  if (ciErr) {
    await supabase.from("event_visitors").delete().eq("id", visitor.id);
    return { error: "Não foi possível registrar a presença do visitante." };
  }

  revalidatePath(`/eventos/${eventId}`);
  return { ok: true };
}

/** Release a person: mark as gone. Auto-closes the event when it was the last. */
export async function releaseEventCheckin(eventId: string, checkinId: string) {
  const ctx = await requireSession();
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("event_checkins")
    .update({
      status: "left",
      authorized_at: now,
      authorized_by: ctx.userId,
      check_out_time: now,
    })
    .eq("id", checkinId);

  const { count: notLeft } = await supabase
    .from("event_checkins")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .neq("status", "left");
  if (!notLeft) {
    await supabase
      .from("events")
      .update({ closed_at: now })
      .eq("id", eventId)
      .is("closed_at", null);
    revalidatePath("/eventos");
  }

  revalidatePath(`/eventos/${eventId}`);
}

/** Undo a release — back to present. */
export async function undoEventRelease(eventId: string, checkinId: string) {
  await requireSession();
  const supabase = await createClient();
  await supabase
    .from("event_checkins")
    .update({
      status: "present",
      authorized_at: null,
      authorized_by: null,
      check_out_time: null,
    })
    .eq("id", checkinId);
  revalidatePath(`/eventos/${eventId}`);
}

export async function removeEventCheckin(eventId: string, checkinId: string) {
  await requireSession();
  const supabase = await createClient();
  // A visitor lives only in the event → remove them with their check-in.
  const { data: ci } = await supabase
    .from("event_checkins")
    .select("visitor_id")
    .eq("id", checkinId)
    .maybeSingle();
  await supabase.from("event_checkins").delete().eq("id", checkinId);
  if (ci?.visitor_id) {
    await supabase.from("event_visitors").delete().eq("id", ci.visitor_id);
  }
  revalidatePath(`/eventos/${eventId}`);
}

/** Close the event — only once everyone has left. */
export async function closeEvent(eventId: string) {
  await requireSession();
  const supabase = await createClient();

  const { count: total } = await supabase
    .from("event_checkins")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  const { count: notLeft } = await supabase
    .from("event_checkins")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .neq("status", "left");

  if (!total) return;
  if (notLeft && notLeft > 0) return;

  await supabase
    .from("events")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", eventId);
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/eventos");
}

/** Reopen a closed event — admin only. */
export async function reopenEvent(eventId: string) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  await supabase.from("events").update({ closed_at: null }).eq("id", eventId);
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/eventos");
}

/** Delete an event (admin only). Cascades to visitors + check-ins. */
export async function deleteEvent(eventId: string) {
  await requireRole("unit_admin");
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/eventos");
  redirect("/eventos");
}
