-- 0005 — Row Level Security. Tenant isolation enforced in the database.
-- Pattern per tenant table: SELECT/INSERT/UPDATE pinned to own unit (or global
-- admin); DELETE (and admin-only writes) gated by can_manage(). Helpers wrapped
-- in (select ...) so the JWT is parsed once per statement, not once per row.

-- Enable + force on every table -------------------------------------------
alter table units                 enable row level security;
alter table profiles              enable row level security; alter table profiles              force row level security;
alter table teens                 enable row level security; alter table teens                 force row level security;
alter table unit_services         enable row level security; alter table unit_services         force row level security;
alter table sessions              enable row level security; alter table sessions              force row level security;
alter table checkins              enable row level security; alter table checkins              force row level security;
alter table small_groups          enable row level security; alter table small_groups          force row level security;
alter table small_group_members   enable row level security; alter table small_group_members   force row level security;
alter table volunteers            enable row level security; alter table volunteers            force row level security;
alter table volunteer_attendance  enable row level security; alter table volunteer_attendance  force row level security;
-- teen_id_counters: no RLS policies -> only reachable via SECURITY DEFINER fn / service role.
alter table teen_id_counters      enable row level security;

-- units: readable by any authenticated user; writable by global admin only ---
create policy units_sel on units for select to authenticated using (true);
create policy units_all on units for all to authenticated
  using ((select public.is_global_admin()))
  with check ((select public.is_global_admin()));

-- profiles: self + own-unit admin + global admin (no recursion: uses auth.uid/JWT)
create policy profiles_sel on profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit()))
  );
create policy profiles_upd on profiles for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit()))
  )
  with check (
    id = (select auth.uid())
    or (select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit()))
  );
-- INSERT of profiles is done server-side with the service role only.

-- Guard profile role/unit changes:
--   * a user can never change their own role or unit;
--   * only a global admin can grant the global_admin role.
-- (RLS WITH CHECK already confines a unit admin's writes to their own unit.)
create or replace function public.guard_profile_self_escalation()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if not (select public.is_global_admin()) then
    if (select auth.uid()) = new.id
       and (new.role is distinct from old.role
            or new.unit_id is distinct from old.unit_id) then
      raise exception 'not allowed to change your own role or unit';
    end if;
    if new.role = 'global_admin' and old.role is distinct from 'global_admin' then
      raise exception 'only a global admin can grant the global admin role';
    end if;
  end if;
  return new;
end $$;

create trigger trg_profile_guard
  before update on profiles
  for each row execute function public.guard_profile_self_escalation();

-- Generic tenant policies ---------------------------------------------------
-- teens
create policy teens_sel on teens for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy teens_ins on teens for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy teens_upd on teens for update to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy teens_del on teens for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

-- unit_services (culto times: read own unit/global; admin-tier writes)
create policy services_sel on unit_services for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy services_write on unit_services for all to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())))
  with check ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

-- sessions
create policy sessions_sel on sessions for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy sessions_ins on sessions for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
-- Update allowed for own unit: the door operator (often a volunteer) needs to
-- save notes and close the culto. Reopen is gated to admins in the server action.
create policy sessions_upd on sessions for update to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy sessions_del on sessions for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

-- checkins
create policy checkins_sel on checkins for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy checkins_ins on checkins for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy checkins_upd on checkins for update to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
-- Delete allowed for own unit: volunteers must be able to undo a mistaken check-in.
create policy checkins_del on checkins for delete to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));

-- small_groups (volunteers may create/edit groups)
create policy groups_all on small_groups for all to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));

-- small_group_members
create policy sgm_all on small_group_members for all to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));

-- volunteers: read + insert for own unit (quick-add during check-in);
-- update/delete are admin-tier.
create policy vol_sel on volunteers for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy vol_ins on volunteers for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy vol_upd on volunteers for update to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())))
  with check ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));
create policy vol_del on volunteers for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

-- volunteer_attendance (any volunteer can mark presence)
create policy va_sel on volunteer_attendance for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy va_ins on volunteer_attendance for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy va_upd on volunteer_attendance for update to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy va_del on volunteer_attendance for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));
