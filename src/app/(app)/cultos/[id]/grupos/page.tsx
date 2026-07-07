import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/age";
import { firstTimerTeenIds } from "@/lib/attendance";
import { GroupsBoard, type GroupView, type LeaderRow } from "./GroupsBoard";
import { getSession } from "../session";

export default async function GruposTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const session = await getSession(id);
  if (!session) notFound();
  const sessionDate = session.session_date;

  // Batch 1 — all keyed only by session id, so fetch together: check-ins (to
  // know who is ungrouped), the groups, and this culto's present volunteers.
  const [checkins, groups, att] = await Promise.all([
    supabase.from("checkins").select("id, teen_id").eq("session_id", id).then((r) => r.data ?? []),
    supabase
      .from("small_groups")
      .select("id, label, sex, outside_age_rule, volunteer_id")
      .eq("session_id", id)
      .order("label")
      .then((r) => r.data ?? []),
    supabase
      .from("volunteer_attendance")
      .select("volunteer_id, leads_group")
      .eq("session_id", id)
      .eq("present", true)
      .then((r) => r.data ?? []),
  ]);
  const totalCheckins = checkins.length;
  const groupIds = groups.map((g) => g.id);
  const leaderIds = groups
    .map((g) => g.volunteer_id)
    .filter((v): v is string => Boolean(v));
  const presentIds = att.map((a) => a.volunteer_id);
  const leadsSet = new Set(
    att.filter((a) => a.leads_group).map((a) => a.volunteer_id),
  );

  // Batch 2 — each depends only on batch 1: group leaders, group members, and
  // the present volunteers' details (for the "Líderes" modal).
  const [leaders, members, presentVols] = await Promise.all([
    leaderIds.length
      ? supabase.from("volunteers").select("id, name").in("id", leaderIds).then((r) => r.data ?? [])
      : Promise.resolve([]),
    groupIds.length
      ? supabase
          .from("small_group_members")
          .select("id, group_id, checkin_id, assigned_manually")
          .in("group_id", groupIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    presentIds.length
      ? supabase
          .from("volunteers")
          .select("id, name, sex, birthdate, functions")
          .in("id", presentIds)
          .order("name")
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);
  const leaderName = new Map(leaders.map((v) => [v.id, v.name]));

  // Enrich members with teen info (member -> checkin -> teen).
  const checkinToTeen = new Map(checkins.map((c) => [c.id, c.teen_id]));
  const memberTeenIds = members
    .map((m) => checkinToTeen.get(m.checkin_id))
    .filter((v): v is string => Boolean(v));

  // Batch 3 — both depend only on memberTeenIds.
  const [teens, firstTimers] = await Promise.all([
    memberTeenIds.length
      ? supabase
          .from("teens")
          .select("id, display_id, name, sex, birthdate, guardian_name, guardian_phone")
          .in("id", memberTeenIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    firstTimerTeenIds(supabase, session.unit_id, sessionDate, memberTeenIds),
  ]);
  const teenMap = new Map(teens.map((t) => [t.id, t]));

  const groupViews: GroupView[] = groups.map((g) => ({
    id: g.id,
    label: g.label ?? "Grupo",
    sex: g.sex,
    outsideAgeRule: g.outside_age_rule,
    leaderName: g.volunteer_id ? (leaderName.get(g.volunteer_id) ?? null) : null,
    members: members
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
            isFirstTime: firstTimers.has(t.id),
          },
        ];
      })
      .sort((a, b) => a.age - b.age),
  }));

  const groupedCount = members.length;
  const ungroupedCount = Math.max(0, totalCheckins - groupedCount);

  // Present volunteers this culto, for the "Líderes" modal (fetched in batch 2).
  const leaderRows: LeaderRow[] = presentVols.map((v) => ({
    id: v.id,
    name: v.name,
    canLead: Boolean(v.sex && v.birthdate),
    isPequenosGrupos: (v.functions ?? []).includes("pequenos_grupos"),
    leads: leadsSet.has(v.id),
  }));

  return (
    <GroupsBoard
      sessionId={id}
      sessionDate={sessionDate}
      groups={groupViews}
      ungroupedCount={ungroupedCount}
      totalCheckins={totalCheckins}
      leaders={leaderRows}
    />
  );
}
