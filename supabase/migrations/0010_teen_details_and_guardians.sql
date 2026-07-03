-- 0010 — Teen address/observation fields + multiple guardians.
-- teens keeps guardian_name/guardian_phone as a denormalised cache of the
-- PRIMARY guardian (kept in sync by the write actions) so the check-in board's
-- quick WhatsApp link and existing reads keep working; teen_guardians is the
-- source of truth for the full 1..n list.

alter table teens
  add column cep          text,
  add column street       text,
  add column neighborhood text,   -- bairro
  add column city         text,
  add column state        text,   -- UF
  add column observations text;

-- Guardians (responsáveis): 1..n per teen -----------------------------------
create table teen_guardians (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references units(id),
  teen_id      uuid not null,
  name         text not null,
  phone        text not null,
  relationship text,                              -- 'mãe', 'pai', 'avó'…
  is_primary   boolean not null default false,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  foreign key (unit_id, teen_id) references teens (unit_id, id) on delete cascade,
  unique (unit_id, id)
);
create index teen_guardians_teen on teen_guardians (teen_id, sort_order);

-- Backfill: migrate each teen's single existing guardian into the child table.
insert into teen_guardians (unit_id, teen_id, name, phone, is_primary, sort_order)
select unit_id, id, guardian_name, guardian_phone, true, 0
from teens;

-- RLS: same tenant template as teens (guardians edited alongside the teen) -----
alter table teen_guardians enable row level security;
alter table teen_guardians force row level security;

create policy tg_sel on teen_guardians for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy tg_ins on teen_guardians for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy tg_upd on teen_guardians for update to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy tg_del on teen_guardians for delete to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
