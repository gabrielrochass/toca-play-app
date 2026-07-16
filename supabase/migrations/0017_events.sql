-- 0017 — Events module. Events span all units (unit_id NULL = "Todas") or one
-- unit. Same check-in/out state machine as cultos. A person at an event is
-- either an existing/registered teen (routed to a unit) or a "Visitante"
-- (event_visitors) with no unit. ADDITIVE: creates new tables/functions only —
-- no ALTER/DROP/DELETE/TRUNCATE on existing data.

-- ---- Tables --------------------------------------------------------------

create table events (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid references units(id),      -- NULL = todas as unidades
  name       text not null,
  event_date date not null,
  start_time time,
  location   text,
  notes      text,
  closed_at  timestamptz,                    -- null = aberto
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index events_date on events (event_date desc);

-- A visitor belongs to NO unit — lives only inside the event.
create table event_visitors (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  name           text not null,
  sex            sex,
  birthdate      date,
  guardian_name  text,
  guardian_phone text,
  created_at     timestamptz not null default now()
);
create index event_visitors_event on event_visitors (event_id);

-- Check-in row: exactly one subject — a teen (of some unit) OR a visitor.
create table event_checkins (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  unit_id        uuid references units(id),   -- teen's unit; NULL for visitor
  teen_id        uuid,
  visitor_id     uuid references event_visitors(id) on delete cascade,
  status         checkin_status not null default 'present',
  check_in_time  timestamptz not null default now(),
  authorized_at  timestamptz,
  authorized_by  uuid references profiles(id),
  check_out_time timestamptz,
  checked_in_by  uuid references profiles(id),
  created_at     timestamptz not null default now(),
  -- exactly one subject
  constraint chk_subject check ((teen_id is not null) <> (visitor_id is not null)),
  -- unit-safe teen link (only enforced when it's a teen; NULLs skip the FK)
  foreign key (unit_id, teen_id) references teens (unit_id, id),
  -- no double check-in (NULLs are distinct in a unique index, so many visitors
  -- and many teens coexist fine)
  unique (event_id, teen_id),
  unique (event_id, visitor_id),
  -- same state machine as checkins (0002)
  constraint chk_present check (status <> 'present'
    or (authorized_at is null and check_out_time is null)),
  constraint chk_authorized check (status <> 'authorized_to_leave'
    or (authorized_at is not null and check_out_time is null)),
  constraint chk_left check (status <> 'left'
    or (authorized_at is not null and check_out_time is not null)),
  -- a teen check-in MUST carry the teen's unit: the composite FK above is
  -- MATCH SIMPLE, so a NULL unit_id would silently skip it (dangling teen_id).
  constraint chk_teen_needs_unit check (visitor_id is not null or unit_id is not null)
);
create index event_checkins_event    on event_checkins (event_id);
create index event_checkins_visitor  on event_checkins (visitor_id);

-- ---- Access helper -------------------------------------------------------
-- An event is a SHARED context: on a "Todas" event all three units see/manage
-- the same roster. So event children are gated by event access, not by unit.
create or replace function public.can_access_event(p_event uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from events e
    where e.id = p_event
      and ((select public.is_global_admin())
           or e.unit_id is null
           or e.unit_id = (select public.current_unit()))
  );
$$;
grant execute on function public.can_access_event(uuid) to authenticated;

-- ---- RLS -----------------------------------------------------------------
alter table events         enable row level security; alter table events         force row level security;
alter table event_visitors enable row level security; alter table event_visitors force row level security;
alter table event_checkins enable row level security; alter table event_checkins force row level security;

-- events: see global + own-unit; anyone may create a global or own-unit event
-- (any volunteer creates events); update (close/reopen) allowed to who can see
-- it; delete gated to admins of the owning scope.
create policy events_sel on events for select to authenticated
  using ((select public.is_global_admin()) or unit_id is null or unit_id = (select public.current_unit()));
create policy events_ins on events for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id is null or unit_id = (select public.current_unit()));
create policy events_upd on events for update to authenticated
  using ((select public.is_global_admin()) or unit_id is null or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id is null or unit_id = (select public.current_unit()));
create policy events_del on events for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

-- Guard: only a global admin may change an event's SCOPE (unit_id). Without
-- this, a volunteer could rescope a "Todas" event to their own unit via a
-- crafted PATCH (WITH CHECK alone can't see the OLD row), locking the other
-- units out of the shared roster. closed_at/notes/etc. stay freely editable.
create or replace function public.events_guard_unit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.unit_id is distinct from old.unit_id
     and not (select public.is_global_admin()) then
    raise exception 'Só o admin geral pode mudar a unidade de um evento';
  end if;
  return new;
end $$;
create trigger events_no_rescope before update on events
  for each row execute function public.events_guard_unit();

-- event children: visibility/management follows event access.
create policy event_visitors_all on event_visitors for all to authenticated
  using (public.can_access_event(event_id))
  with check (public.can_access_event(event_id));
create policy event_checkins_all on event_checkins for all to authenticated
  using (public.can_access_event(event_id))
  with check (public.can_access_event(event_id));

-- ---- Controlled cross-unit functions (gated by can_access_event) ---------

-- Register a NEW teen into p_unit AND check them into the event, atomically.
-- security definer so any volunteer at an accessible event can route a teen to
-- ANY unit (relaxes per-unit isolation ONLY inside the event). display_id/seq
-- are auto-set by the teens trigger.
create or replace function public.register_event_teen(
  p_event uuid, p_unit uuid,
  p_name text, p_birthdate date, p_sex sex, p_guardians jsonb,
  p_cep text default null, p_street text default null,
  p_neighborhood text default null, p_city text default null,
  p_state text default null, p_observations text default null
)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_teen uuid;
  g jsonb;
  i int := 0;
begin
  if not public.can_access_event(p_event) then
    raise exception 'Sem acesso a este evento';
  end if;
  -- On a unit-scoped event, the teen must go to THAT unit (a global "Todas"
  -- event allows any unit — that's the intended cross-unit path).
  if exists (
    select 1 from events e
    where e.id = p_event and e.unit_id is not null and e.unit_id <> p_unit
  ) then
    raise exception 'A unidade não corresponde à do evento';
  end if;
  if p_guardians is null or jsonb_array_length(p_guardians) < 1 then
    raise exception 'Informe ao menos um responsável';
  end if;

  -- Persist the full teen (address + observations too) so the event cadastro is
  -- as complete as one made on the cadastros page.
  insert into teens (
    unit_id, name, birthdate, sex, guardian_name, guardian_phone,
    cep, street, neighborhood, city, state, observations
  )
  values (
    p_unit, p_name, p_birthdate, p_sex,
    coalesce(p_guardians->0->>'name', ''),
    coalesce(p_guardians->0->>'phone', ''),
    nullif(p_cep, ''), nullif(p_street, ''), nullif(p_neighborhood, ''),
    nullif(p_city, ''), nullif(p_state, ''), nullif(p_observations, '')
  )
  returning id into v_teen;

  for g in select * from jsonb_array_elements(p_guardians) loop
    insert into teen_guardians (unit_id, teen_id, name, phone, relationship, is_primary, sort_order)
    values (p_unit, v_teen, g->>'name', g->>'phone', nullif(g->>'relationship', ''), i = 0, i);
    i := i + 1;
  end loop;

  insert into event_checkins (event_id, unit_id, teen_id, checked_in_by)
  values (p_event, p_unit, v_teen, auth.uid());

  return v_teen;
end $$;
grant execute on function public.register_event_teen(
  uuid, uuid, text, date, sex, jsonb, text, text, text, text, text, text
) to authenticated;

-- Search teens across units for the event (respects the event's scope:
-- Todas → all units, unit-specific event → that unit). Excludes already
-- checked-in teens. security definer so cross-unit find works inside the event.
create or replace function public.search_event_teens(p_event uuid, p_term text)
returns table (
  id uuid, display_id text, name text, unit_id uuid, unit_code text,
  sex sex, birthdate date, guardian_name text, guardian_phone text
)
language sql stable security definer set search_path = public
as $$
  select t.id, t.display_id, t.name, t.unit_id, u.code,
         t.sex, t.birthdate, t.guardian_name, t.guardian_phone
  from teens t
  join units u on u.id = t.unit_id
  join events e on e.id = p_event
  where public.can_access_event(p_event)
    and t.is_active
    and (e.unit_id is null or t.unit_id = e.unit_id)
    and (t.name ilike '%' || p_term || '%' or t.display_id ilike '%' || p_term || '%')
    and not exists (
      select 1 from event_checkins ec
      where ec.event_id = p_event and ec.teen_id = t.id
    )
  order by t.name
  limit 8;
$$;
grant execute on function public.search_event_teens(uuid, text) to authenticated;

-- Enriched roster for the board + reports (teens across units + visitors),
-- gated by event access.
create or replace function public.event_roster(p_event uuid)
returns table (
  checkin_id uuid, status checkin_status, is_visitor boolean,
  name text, unit_id uuid, unit_code text, sex sex, birthdate date,
  guardian_name text, guardian_phone text, check_in_time timestamptz
)
language sql stable security definer set search_path = public
as $$
  select ec.id, ec.status, (ec.visitor_id is not null),
         coalesce(t.name, v.name),
         ec.unit_id, u.code,
         coalesce(t.sex, v.sex),
         coalesce(t.birthdate, v.birthdate),
         coalesce(t.guardian_name, v.guardian_name),
         coalesce(t.guardian_phone, v.guardian_phone),
         ec.check_in_time
  from event_checkins ec
  left join teens t          on t.id = ec.teen_id
  left join event_visitors v on v.id = ec.visitor_id
  left join units u          on u.id = ec.unit_id
  where ec.event_id = p_event and public.can_access_event(p_event)
  order by ec.check_in_time;
$$;
grant execute on function public.event_roster(uuid) to authenticated;

-- Live board across devices/units.
alter publication supabase_realtime add table event_checkins;
