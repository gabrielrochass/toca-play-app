import { notFound } from "next/navigation";
import { requireSession, hasAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/age";
import { firstTimerTeenIds } from "@/lib/attendance";
import { NotesEditor } from "./NotesEditor";
import { CheckinBoard, type BoardCheckin } from "./CheckinBoard";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("session_date, notes, unit_id, closed_at")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: rawCheckins } = await supabase
    .from("checkins")
    .select("id, teen_id, status, guardian_id")
    .eq("session_id", id)
    .order("check_in_time");

  const teenIds = (rawCheckins ?? []).map((c) => c.teen_id);
  const { data: teens } = teenIds.length
    ? await supabase
        .from("teens")
        .select("id, display_id, name, sex, birthdate, guardian_name, guardian_phone")
        .in("id", teenIds)
    : { data: [] };

  const teenMap = new Map((teens ?? []).map((t) => [t.id, t]));

  // Guardian lookup by id — to resolve today's chosen responsável per check-in.
  const guardianById = new Map<string, { name: string; phone: string }>();
  if (teenIds.length) {
    const { data: gRows } = await supabase
      .from("teen_guardians")
      .select("id, name, phone")
      .in("teen_id", teenIds);
    for (const g of gRows ?? []) {
      guardianById.set(g.id, { name: g.name, phone: g.phone });
    }
  }

  const firstTimers = await firstTimerTeenIds(
    supabase,
    session.unit_id,
    session.session_date,
    teenIds,
  );

  const checkins: BoardCheckin[] = (rawCheckins ?? []).flatMap((c) => {
    const t = teenMap.get(c.teen_id);
    if (!t) return [];
    // Today's responsável: the one chosen at check-in, else the primary.
    const chosen = c.guardian_id ? guardianById.get(c.guardian_id) : undefined;
    return [
      {
        id: c.id,
        teenId: c.teen_id,
        displayId: t.display_id,
        name: t.name,
        sex: t.sex,
        birthdate: t.birthdate,
        age: ageAt(t.birthdate, session.session_date),
        status: c.status,
        guardianName: chosen?.name ?? t.guardian_name,
        guardianPhone: chosen?.phone ?? t.guardian_phone,
        isFirstTime: firstTimers.has(c.teen_id),
      },
    ];
  });

  return (
    <div className="flex flex-col gap-4">
      <NotesEditor sessionId={id} initialNotes={session.notes} />
      <CheckinBoard
        sessionId={id}
        unitId={session.unit_id}
        sessionDate={session.session_date}
        checkins={checkins}
        closed={Boolean(session.closed_at)}
        canReopen={hasAtLeast(ctx.profile.role, "unit_admin")}
      />
    </div>
  );
}
