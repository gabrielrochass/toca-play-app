import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AttendanceList } from "./AttendanceList";
import { getSession } from "../session";

export default async function VoluntariosTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const session = await getSession(id);
  if (!session) notFound();

  const { data: volunteers } = await supabase
    .from("volunteers")
    .select("id, name, sex, birthdate")
    .eq("unit_id", session.unit_id)
    .eq("is_active", true)
    .order("name");

  const { data: attendance } = await supabase
    .from("volunteer_attendance")
    .select("volunteer_id, present")
    .eq("session_id", id);

  const presentSet = new Set(
    (attendance ?? []).filter((a) => a.present).map((a) => a.volunteer_id),
  );

  const rows = (volunteers ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    present: presentSet.has(v.id),
    canLead: Boolean(v.sex && v.birthdate),
  }));

  return <AttendanceList sessionId={id} volunteers={rows} />;
}
