/** Attendance history helpers (server-side; take the RLS-scoped client). */

type Supabase = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

export interface SessionRef {
  unit_id: string;
  session_date: string;
  service_id: string;
}

/**
 * Of the given teen_ids, which are attending for the FIRST time — i.e. have no
 * check-in in any culto of the unit that comes BEFORE this one in (date, service
 * start_time) order. Used for the "1ª vez" badge. Same-day cultos count: a teen
 * seen at 09h is no longer a first-timer at 11h10. Retired service slots are
 * looked up too, so an old culto still resolves its start_time.
 */
export async function firstTimerTeenIds(
  supabase: Supabase,
  session: SessionRef,
  teenIds: string[],
): Promise<Set<string>> {
  if (!teenIds.length) return new Set();

  const [{ data: sessions }, { data: services }, { data: history }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id, session_date, service_id")
        .eq("unit_id", session.unit_id)
        .lte("session_date", session.session_date),
      supabase
        .from("unit_services")
        .select("id, start_time")
        .eq("unit_id", session.unit_id),
      supabase
        .from("checkins")
        .select("teen_id, session_id")
        .eq("unit_id", session.unit_id)
        .in("teen_id", teenIds),
    ]);

  const startOf = new Map((services ?? []).map((s) => [s.id, s.start_time]));
  const thisStart = startOf.get(session.service_id) ?? "";
  const priorIds = new Set(
    (sessions ?? [])
      .filter(
        (s) =>
          s.session_date < session.session_date ||
          (startOf.get(s.service_id) ?? "") < thisStart,
      )
      .map((s) => s.id),
  );
  if (!priorIds.size) return new Set(teenIds); // no earlier culto → all first-time

  const returning = new Set(
    (history ?? [])
      .filter((c) => priorIds.has(c.session_id))
      .map((c) => c.teen_id),
  );
  return new Set(teenIds.filter((id) => !returning.has(id)));
}
