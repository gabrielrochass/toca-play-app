"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import {
  formGroups,
  type GroupingCandidate,
  type GroupingVolunteer,
} from "@/lib/grouping/formGroups";
import { ageAt } from "@/lib/age";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadSession(supabase: Supabase, sessionId: string) {
  const { data } = await supabase
    .from("sessions")
    .select("unit_id, session_date")
    .eq("id", sessionId)
    .maybeSingle();
  return data;
}

/** Build grouping candidates (checkinId + sex + birthdate) for a set of check-ins. */
async function candidatesFor(
  supabase: Supabase,
  checkins: { id: string; teen_id: string }[],
): Promise<GroupingCandidate[]> {
  if (!checkins.length) return [];
  const teenIds = checkins.map((c) => c.teen_id);
  const { data: teens } = await supabase
    .from("teens")
    .select("id, sex, birthdate")
    .in("id", teenIds);
  const map = new Map((teens ?? []).map((t) => [t.id, t]));
  return checkins.flatMap((c) => {
    const t = map.get(c.teen_id);
    if (!t) return [];
    return [{ id: c.id, sex: t.sex, birthdate: t.birthdate }];
  });
}

/** Present volunteers of the session that can lead (have sex + birthdate). */
async function presentVolunteers(
  supabase: Supabase,
  sessionId: string,
): Promise<GroupingVolunteer[]> {
  const { data: att } = await supabase
    .from("volunteer_attendance")
    .select("volunteer_id")
    .eq("session_id", sessionId)
    .eq("present", true);
  const ids = (att ?? []).map((a) => a.volunteer_id);
  if (!ids.length) return [];

  const { data: vols } = await supabase
    .from("volunteers")
    .select("id, sex, birthdate")
    .in("id", ids)
    .eq("is_active", true);
  return (vols ?? [])
    .filter((v) => v.sex && v.birthdate)
    .map((v) => ({ id: v.id, sex: v.sex as GroupingVolunteer["sex"], birthdate: v.birthdate as string }));
}

async function persistGroups(
  supabase: Supabase,
  sessionId: string,
  unitId: string,
  candidates: GroupingCandidate[],
  volunteers: GroupingVolunteer[],
  sessionDate: string,
  startIndex: number,
) {
  const formed = formGroups(candidates, sessionDate, volunteers);
  let n = startIndex;
  for (const g of formed) {
    const { data: group } = await supabase
      .from("small_groups")
      .insert({
        unit_id: unitId,
        session_id: sessionId,
        label: `Grupo ${n}`,
        sex: g.sex,
        volunteer_id: g.volunteerId,
        outside_age_rule: g.outsideAgeRule,
      })
      .select("id")
      .single();
    n++;
    if (!group) continue;
    await supabase.from("small_group_members").insert(
      g.memberIds.map((checkinId) => ({
        unit_id: unitId,
        group_id: group.id,
        checkin_id: checkinId,
        assigned_manually: false,
      })),
    );
  }
}

/** Wipe and regenerate all groups from every check-in. Destructive. */
export async function generateGroups(sessionId: string) {
  await requireSession();
  const supabase = await createClient();
  const session = await loadSession(supabase, sessionId);
  if (!session) return;

  await supabase.from("small_groups").delete().eq("session_id", sessionId);

  const { data: checkins } = await supabase
    .from("checkins")
    .select("id, teen_id")
    .eq("session_id", sessionId);

  const candidates = await candidatesFor(supabase, checkins ?? []);
  const volunteers = await presentVolunteers(supabase, sessionId);
  await persistGroups(
    supabase,
    sessionId,
    session.unit_id,
    candidates,
    volunteers,
    session.session_date,
    1,
  );
  revalidatePath(`/cultos/${sessionId}/grupos`);
}

/** Group only check-ins not yet in a group. Preserves existing groups + manual moves. */
export async function fillNewCheckins(sessionId: string) {
  await requireSession();
  const supabase = await createClient();
  const session = await loadSession(supabase, sessionId);
  if (!session) return;

  const { data: groups } = await supabase
    .from("small_groups")
    .select("id, volunteer_id")
    .eq("session_id", sessionId);
  const groupIds = (groups ?? []).map((g) => g.id);
  const usedVolunteerIds = new Set(
    (groups ?? []).map((g) => g.volunteer_id).filter(Boolean),
  );

  let groupedCheckinIds = new Set<string>();
  if (groupIds.length) {
    const { data: members } = await supabase
      .from("small_group_members")
      .select("checkin_id")
      .in("group_id", groupIds);
    groupedCheckinIds = new Set((members ?? []).map((m) => m.checkin_id));
  }

  const { data: checkins } = await supabase
    .from("checkins")
    .select("id, teen_id")
    .eq("session_id", sessionId);
  const newCheckins = (checkins ?? []).filter(
    (c) => !groupedCheckinIds.has(c.id),
  );
  if (!newCheckins.length) return;

  const candidates = await candidatesFor(supabase, newCheckins);
  const freeVolunteers = (await presentVolunteers(supabase, sessionId)).filter(
    (v) => !usedVolunteerIds.has(v.id),
  );
  await persistGroups(
    supabase,
    sessionId,
    session.unit_id,
    candidates,
    freeVolunteers,
    session.session_date,
    groupIds.length + 1,
  );
  revalidatePath(`/cultos/${sessionId}/grupos`);
}

/** Recompute the outside-age-rule flag for a group; delete it if empty. */
async function recomputeGroupFlag(
  supabase: Supabase,
  groupId: string,
  sessionDate: string,
) {
  const { data: members } = await supabase
    .from("small_group_members")
    .select("checkin_id")
    .eq("group_id", groupId);

  if (!members?.length) {
    await supabase.from("small_groups").delete().eq("id", groupId);
    return;
  }

  const { data: checkins } = await supabase
    .from("checkins")
    .select("teen_id")
    .in(
      "id",
      members.map((m) => m.checkin_id),
    );
  const teenIds = (checkins ?? []).map((c) => c.teen_id);
  const { data: teens } = await supabase
    .from("teens")
    .select("birthdate")
    .in("id", teenIds);

  const ages = (teens ?? []).map((t) => ageAt(t.birthdate, sessionDate));
  const spread = ages.length ? Math.max(...ages) - Math.min(...ages) : 0;

  await supabase
    .from("small_groups")
    .update({ outside_age_rule: spread > 3 })
    .eq("id", groupId);
}

/** Manually move a member to another group and recompute both groups' flags. */
export async function moveMember(
  sessionId: string,
  memberId: string,
  targetGroupId: string,
) {
  await requireSession();
  const supabase = await createClient();
  const session = await loadSession(supabase, sessionId);
  if (!session) return;

  const { data: member } = await supabase
    .from("small_group_members")
    .select("group_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return;
  const sourceGroupId = member.group_id;
  if (sourceGroupId === targetGroupId) return;

  await supabase
    .from("small_group_members")
    .update({ group_id: targetGroupId, assigned_manually: true })
    .eq("id", memberId);

  await recomputeGroupFlag(supabase, targetGroupId, session.session_date);
  await recomputeGroupFlag(supabase, sourceGroupId, session.session_date);
  revalidatePath(`/cultos/${sessionId}/grupos`);
}
