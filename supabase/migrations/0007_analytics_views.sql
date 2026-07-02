-- 0007 — Analytics views.
-- security_invoker = on so base-table RLS (per-unit isolation) still applies:
-- a unit admin querying these sees only their own unit's rows.
-- Plain views (not materialised): volume is small (hundreds of teens, weekly
-- sessions) and always-fresh beats refresh orchestration here.

-- Teen attendance per session ----------------------------------------------
create view v_session_attendance
with (security_invoker = on) as
select s.id           as session_id,
       s.unit_id,
       s.session_date,
       svc.label      as service_label,
       s.closed_at,
       count(c.teen_id) as teens_present
from sessions s
join unit_services svc on svc.id = s.service_id
left join checkins c on c.session_id = s.id
group by s.id, s.unit_id, s.session_date, svc.label;

-- Unique teens per month -----------------------------------------------------
create view v_monthly_unique_teens
with (security_invoker = on) as
select s.unit_id,
       date_trunc('month', s.session_date)::date as month,
       count(distinct c.teen_id) as unique_teens
from sessions s
join checkins c on c.session_id = s.id
group by s.unit_id, date_trunc('month', s.session_date);

-- New teens registered per month + cumulative "since the beginning" ----------
create view v_teen_growth
with (security_invoker = on) as
select unit_id,
       date_trunc('month', created_at)::date as month,
       count(*) as new_teens,
       sum(count(*)) over (
         partition by unit_id
         order by date_trunc('month', created_at)
       ) as cumulative_teens
from teens
group by unit_id, date_trunc('month', created_at);

-- Volunteer engagement per session ------------------------------------------
create view v_volunteer_engagement
with (security_invoker = on) as
select s.id            as session_id,
       s.unit_id,
       s.session_date,
       svc.label       as service_label,
       count(va.volunteer_id) filter (where va.present) as volunteers_present,
       count(va.volunteer_id)                            as volunteers_registered
from sessions s
join unit_services svc on svc.id = s.service_id
left join volunteer_attendance va on va.session_id = s.id
group by s.id, s.unit_id, s.session_date, svc.label;

-- Per-volunteer engagement (leaderboard / retention) -------------------------
create view v_volunteer_leaderboard
with (security_invoker = on) as
select v.unit_id,
       v.id   as volunteer_id,
       v.name,
       count(va.session_id) filter (where va.present) as sessions_attended,
       max(s.session_date)                            as last_present
from volunteers v
left join volunteer_attendance va on va.volunteer_id = v.id
left join sessions s on s.id = va.session_id
group by v.unit_id, v.id, v.name;

grant select on
  v_session_attendance, v_monthly_unique_teens, v_teen_growth,
  v_volunteer_engagement, v_volunteer_leaderboard
to authenticated;
