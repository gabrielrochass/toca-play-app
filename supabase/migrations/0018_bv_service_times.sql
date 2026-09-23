-- 0018 — Boa Viagem: o culto das 10h virou dois (09h e 11h10); 16h e 18h30
-- continuam. CF/RA não mudam. O slot das 10h é APOSENTADO (is_active = false),
-- nunca apagado nem renomeado: sessions e as views lêem o label ao vivo, então
-- cultos, check-ins e relatórios antigos continuam mostrando "10h".
-- Idempotente e restrita à BV — não toca em sessions nem em checkins.

insert into unit_services (unit_id, label, start_time, sort_order)
select u.id, s.label, s.start_time, s.sort_order
from units u
join (values
  ('BV', '09h',   time '09:00', 1),
  ('BV', '11h10', time '11:10', 2)
) as s(code, label, start_time, sort_order) on s.code = u.code
where not exists (
  select 1 from unit_services x where x.unit_id = u.id and x.label = s.label
);

-- Sai do "Novo culto"; permanece no histórico.
update unit_services set is_active = false
where unit_id = (select id from units where code = 'BV')
  and label = '10h'
  and is_active;

-- Ordem dos horários ativos (09h → 11h10 → 16h → 18h30); o 10h aposentado no fim.
update unit_services svc set sort_order = v.sort_order
from (values
  ('09h', 1), ('11h10', 2), ('16h', 3), ('18h30', 4), ('10h', 90)
) as v(label, sort_order)
where svc.unit_id = (select id from units where code = 'BV')
  and svc.label = v.label
  and svc.sort_order is distinct from v.sort_order;
