-- 0011 — Volunteer functions. A volunteer may hold several (louvor + pequenos
-- grupos, etc.), so it's an enum array on the volunteers row.

do $$ begin
  create type volunteer_function as enum
    ('ministro_culto', 'gerencia', 'recepcao', 'diversao', 'louvor', 'pequenos_grupos');
exception when duplicate_object then null; end $$;

alter table volunteers
  add column functions volunteer_function[] not null default '{}';
