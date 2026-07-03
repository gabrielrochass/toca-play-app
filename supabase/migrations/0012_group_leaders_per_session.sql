-- 0012 — Per-culto small-group leaders. Which present volunteers lead a group
-- is chosen per session (pre-seeded from the 'pequenos_grupos' function, then
-- adjusted in a modal), so it lives on volunteer_attendance, not on the
-- volunteer. The grouping algorithm's leader pool = present + leads_group.

alter table volunteer_attendance
  add column leads_group boolean not null default false;
