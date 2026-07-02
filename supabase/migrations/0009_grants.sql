-- 0009 — Table privileges for the API roles.
-- RLS gates which ROWS a role sees; PostgREST roles still need table-level
-- privileges to touch the tables at all. Row access stays governed by the
-- policies in 0005 (every tenant table is ENABLE + FORCE RLS), and
-- teen_id_counters has RLS on with no policy, so it stays deny-by-default.

grant usage on schema public to anon, authenticated, service_role;

-- authenticated: DML on all tables; RLS decides the rows.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- service_role bypasses RLS (provisioning) and needs full table access.
grant all on all tables in schema public to service_role;

-- Keep future tables working without another grants migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
