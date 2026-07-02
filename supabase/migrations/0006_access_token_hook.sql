-- 0006 — Custom Access Token Hook.
-- Runs as supabase_auth_admin at token issuance and injects unit_id + user_role
-- into the JWT claims from profiles. This is the single source that the RLS
-- helpers (0004) read, keeping tenant/role out of user-editable metadata.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  p      record;
begin
  select id, role, unit_id into p
    from public.profiles
   where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if p.id is null then
    -- no profile yet: safe defaults, no unit access
    claims := jsonb_set(claims, '{user_role}', to_jsonb('volunteer'::text));
    claims := jsonb_set(claims, '{unit_id}',   'null'::jsonb);
  else
    claims := jsonb_set(claims, '{user_role}', to_jsonb(p.role::text));
    claims := jsonb_set(claims, '{unit_id}',
      case when p.unit_id is null then 'null'::jsonb else to_jsonb(p.unit_id::text) end);
  end if;

  return jsonb_set(event, '{claims}', claims);
end $$;

-- Only the auth admin may run the hook; everyone else is revoked.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- The hook (as supabase_auth_admin) must be able to read profiles despite RLS.
grant select on table public.profiles to supabase_auth_admin;
create policy profiles_auth_admin_read on public.profiles
  as permissive for select to supabase_auth_admin using (true);
