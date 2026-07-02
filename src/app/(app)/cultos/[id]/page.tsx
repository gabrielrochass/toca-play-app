import { notFound } from "next/navigation";
import { requireSession, hasAtLeast } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/age";
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
    .select("id, teen_id, status")
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

  const checkins: BoardCheckin[] = (rawCheckins ?? []).flatMap((c) => {
    const t = teenMap.get(c.teen_id);
    if (!t) return [];
    return [
      {
        id: c.id,
        teenId: c.teen_id,
        displayId: t.display_id,
        name: t.name,
        sex: t.sex,
        age: ageAt(t.birthdate, session.session_date),
        status: c.status,
        guardianName: t.guardian_name,
        guardianPhone: t.guardian_phone,
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
