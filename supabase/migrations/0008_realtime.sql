-- 0008 — Realtime. Add the live check-in board tables to the realtime
-- publication so other devices see check-ins/exits as they happen. RLS still
-- applies to realtime, so users only receive their own unit's changes.

alter publication supabase_realtime add table checkins;
alter publication supabase_realtime add table small_group_members;
alter publication supabase_realtime add table volunteer_attendance;
