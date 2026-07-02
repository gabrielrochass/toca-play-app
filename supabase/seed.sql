-- Seed — the 3 church units. Casa Forte (CF) is the priority rollout.
-- First admin user is created via scripts/create-admin.mjs (needs the auth API),
-- not here, because auth.users passwords must be created through Supabase Auth.

insert into units (code, name) values
  ('CF', 'Casa Forte'),
  ('BV', 'Boa Viagem'),
  ('RA', 'Recife Antigo')
on conflict (code) do nothing;

-- Pre-create the id counters so CF-0001 starts cleanly.
insert into teen_id_counters (unit_id, next_seq)
select id, 1 from units
on conflict (unit_id) do nothing;

-- Service times per unit (the culto slots). Label = the time.
-- Casa Forte / Recife Antigo: 10h and 17h. Boa Viagem: 10h, 16h, 18h30.
insert into unit_services (unit_id, label, start_time, sort_order)
select u.id, s.label, s.start_time, s.sort_order
from units u
join (values
  ('CF', '10h',   time '10:00', 1),
  ('CF', '17h',   time '17:00', 2),
  ('RA', '10h',   time '10:00', 1),
  ('RA', '17h',   time '17:00', 2),
  ('BV', '10h',   time '10:00', 1),
  ('BV', '16h',   time '16:00', 2),
  ('BV', '18h30', time '18:30', 3)
) as s(code, label, start_time, sort_order) on s.code = u.code
where not exists (
  select 1 from unit_services x where x.unit_id = u.id and x.label = s.label
);
