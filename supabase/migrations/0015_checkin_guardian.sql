-- 0015 — Which responsável brought the teen today, chosen at check-in when the
-- teen has more than one guardian. Notifications target this guardian. Null =
-- single-guardian teen or not chosen → callers fall back to the primary guardian.

alter table checkins
  add column guardian_id uuid,
  add constraint checkins_guardian_fk
    foreign key (unit_id, guardian_id)
    references teen_guardians (unit_id, id)
    on delete set null;

create index checkins_guardian on checkins (guardian_id);
