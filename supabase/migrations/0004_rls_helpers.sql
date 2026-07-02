-- 0004 — RLS helper functions.
-- These read the request JWT claims only (populated by the custom access token
-- hook in 0006), NEVER the profiles table -> no RLS recursion, and the claim is
-- parsed once per statement when wrapped in (select ...) inside a policy.

create or replace function public.jwt_role()
returns app_role
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    'volunteer'
  )::app_role;
$$;

create or replace function public.current_unit()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'unit_id', '')::uuid;
$$;

create or replace function public.is_global_admin()
returns boolean
language sql stable
as $$ select public.jwt_role() = 'global_admin'; $$;

create or replace function public.can_manage()
returns boolean
language sql stable
as $$ select public.jwt_role() in ('global_admin', 'unit_admin'); $$;

grant execute on function public.jwt_role, public.current_unit,
  public.is_global_admin, public.can_manage to anon, authenticated;
