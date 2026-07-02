import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/age";
import { GroupsBoard, type GroupView } from "./GroupsBoard";

export default async function GruposTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("session_date")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();
  const sessionDate = session.session_date;

  // All check-ins for the session (to know who is ungrouped).
  const { data: checkins } = await supabase
    .from("checkins")
    .select("id, teen_id")
    .eq("session_id", id);
  const totalCheckins = checkins?.length ?? 0;

  const { data: groups } = await supabase
    .from("small_groups")
    .select("id, label, sex, outside_age_rule, volunteer_id")
    .eq("session_id", id)
    .order("label");
  const groupIds = (groups ?? []).map((g) => g.id);

  const leaderIds = (groups ?? [])
    .map((g) => g.volunteer_id)
    .filter((v): v is string => Boolean(v));
  const { data: leaders } = leaderIds.length
    ? await supabase.from("volunteers").select("id, name").in("id", leaderIds)
    : { data: [] };
  const leaderName = new Map((leaders ?? []).map((v) => [v.id, v.name]));

  const { data: members } = groupIds.length
    ? await supabase
        .from("small_group_members")
        .select("id, group_id, checkin_id, assigned_manually")
        .in("group_id", groupIds)
    : { data: [] };

  // Enrich members with teen info (member -> checkin -> teen).
  const checkinToTeen = new Map((checkins ?? []).map((c) => [c.id, c.teen_id]));
  const memberTeenIds = (members ?? [])
    .map((m) => checkinToTeen.get(m.checkin_id))
    .filter((v): v is string => Boolean(v));
  const { data: teens } = memberTeenIds.length
    ? await supabase
        .from("teens")
        .select("id, display_id, name, sex, birthdate, guardian_name, guardian_phone")
        .in("id", memberTeenIds)
    : { data: [] };
  const teenMap = new Map((teens ?? []).map((t) => [t.id, t]));

  const groupViews: GroupView[] = (groups ?? []).map((g) => ({
    id: g.id,
    label: g.label ?? "Grupo",
    sex: g.sex,
    outsideAgeRule: g.outside_age_rule,
    leaderName: g.volunteer_id ? (leaderName.get(g.volunteer_id) ?? null) : null,
    members: (members ?? [])
      .filter((m) => m.group_id === g.id)
      .flatMap((m) => {
        const teenId = checkinToTeen.get(m.checkin_id);
        const t = teenId ? teenMap.get(teenId) : undefined;
        if (!t) return [];
        return [
          {
            memberId: m.id,
            teenId: t.id,
            displayId: t.display_id,
            name: t.name,
            age: ageAt(t.birthdate, sessionDate),
            sex: t.sex,
            birthdate: t.birthdate,
            guardianName: t.guardian_name,
            guardianPhone: t.guardian_phone,
            assignedManually: m.assigned_manually,
          },
        ];
      })
      .sort((a, b) => a.age - b.age),
  }));

  const groupedCount = (members ?? []).length;
  const ungroupedCount = Math.max(0, totalCheckins - groupedCount);

  return (
    <GroupsBoard
      sessionId={id}
      sessionDate={sessionDate}
      groups={groupViews}
      ungroupedCount={ungroupedCount}
      totalCheckins={totalCheckins}
    />
  );
}
