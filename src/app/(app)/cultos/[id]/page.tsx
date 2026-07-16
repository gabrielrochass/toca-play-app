import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/age";
import { firstTimerTeenIds } from "@/lib/attendance";
import { getUnitScope } from "@/lib/unitScope";
import { NotesEditor } from "./NotesEditor";
import { CheckinBoard, type BoardCheckin } from "./CheckinBoard";
import { getSession, getUnit } from "./session";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const session = await getSession(id);
  if (!session) notFound();

  // Global admin: name the campus in WhatsApp messages sent from this culto.
  const scope = await getUnitScope(ctx);
  const unitName = scope.canSwitch ? (await getUnit(session.unit_id))?.name ?? null : null;

  const { data: rawCheckins } = await supabase
    .from("checkins")
    .select("id, teen_id, status, guardian_id")
    .eq("session_id", id)
    .order("check_in_time");

  const teenIds = (rawCheckins ?? []).map((c) => c.teen_id);

  // teens, guardians and first-timers all depend only on teenIds — fetch in
  // parallel instead of three sequential round-trips.
  const [teens, gRows, firstTimers] = teenIds.length
    ? await Promise.all([
        supabase
          .from("teens")
          .select("id, display_id, name, sex, birthdate, guardian_name, guardian_phone")
          .in("id", teenIds)
          .then((r) => r.data ?? []),
        supabase
          .from("teen_guardians")
          .select("id, name, phone")
          .in("teen_id", teenIds)
          .then((r) => r.data ?? []),
        firstTimerTeenIds(supabase, session.unit_id, session.session_date, teenIds),
      ])
    : [[], [], new Set<string>()];

  const teenMap = new Map(teens.map((t) => [t.id, t]));

  // Guardian lookup by id — to resolve today's chosen responsável per check-in.
  const guardianById = new Map<string, { name: string; phone: string }>();
  for (const g of gRows) {
    guardianById.set(g.id, { name: g.name, phone: g.phone });
  }

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
        unitName={unitName}
        sessionDate={session.session_date}
        checkins={checkins}
        closed={Boolean(session.closed_at)}
      />
    </div>
  );
}
