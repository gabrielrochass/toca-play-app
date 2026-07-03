/** Attendance history helpers (server-side; take the RLS-scoped client). */

type Supabase = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

/**
 * Of the given teen_ids, which are attending for the FIRST time — i.e. have no
 * check-in in any earlier-dated session of the unit. Used for the "1ª vez" badge.
 */
export async function firstTimerTeenIds(
  supabase: Supabase,
  unitId: string,
  sessionDate: string,
  teenIds: string[],
): Promise<Set<string>> {
  if (!teenIds.length) return new Set();

  const { data: priorSessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("unit_id", unitId)
    .lt("session_date", sessionDate);
  const priorIds = (priorSessions ?? []).map((s) => s.id);
  if (!priorIds.length) return new Set(teenIds); // no earlier culto → all first-time

  const { data: prior } = await supabase
    .from("checkins")
    .select("teen_id")
    .in("session_id", priorIds)
    .in("teen_id", teenIds);
  const returning = new Set((prior ?? []).map((c) => c.teen_id));
  return new Set(teenIds.filter((id) => !returning.has(id)));
}
