-- 0014 — Attendance broken down by sex per session, for the "média de
-- pré-adolescentes por sexo por culto" report. security_invoker so per-unit
-- RLS still applies. Uses the existing teens_cohort (unit_id, sex, birthdate) index.

create view v_session_attendance_by_sex
with (security_invoker = on) as
select s.id           as session_id,
       s.unit_id,
       s.session_date,
       svc.label      as service_label,
       count(c.teen_id) filter (where t.sex = 'M') as teens_m,
       count(c.teen_id) filter (where t.sex = 'F') as teens_f
from sessions s
join unit_services svc on svc.id = s.service_id
left join checkins c on c.session_id = s.id
left join teens t on t.id = c.teen_id
group by s.id, s.unit_id, s.session_date, svc.label;

grant select on v_session_attendance_by_sex to authenticated;
