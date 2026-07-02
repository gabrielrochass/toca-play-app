-- 0003 — Per-unit teen display id (CF-0042), concurrency-safe & gapless.
-- A counter row per unit is UPDATE ... RETURNING inside the insert transaction;
-- the row lock serialises concurrent inserts for the same unit (negligible
-- contention at this volume). SECURITY DEFINER so volunteers, who have no RLS
-- access to teen_id_counters, can still trigger id generation.

create or replace function next_teen_display_id(p_unit uuid)
returns table (seq integer, display_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq  integer;
  v_code text;
begin
  insert into teen_id_counters (unit_id, next_seq) values (p_unit, 1)
    on conflict (unit_id) do nothing;

  update teen_id_counters
     set next_seq = next_seq + 1
   where unit_id = p_unit
   returning next_seq - 1 into v_seq;   -- row lock serialises concurrent inserts

  select code into v_code from units where id = p_unit;
  if v_code is null then
    raise exception 'Unknown unit_id % for teen id generation', p_unit;
  end if;

  return query select v_seq, format('%s-%s', v_code, lpad(v_seq::text, 4, '0'));
end $$;

revoke all on function next_teen_display_id(uuid) from public, anon, authenticated;

create or replace function set_teen_display_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if new.seq is null or new.display_id is null then
    select * into r from next_teen_display_id(new.unit_id);
    new.seq        := r.seq;
    new.display_id := r.display_id;
  end if;
  return new;
end $$;

create trigger trg_teen_display_id
  before insert on teens
  for each row execute function set_teen_display_id();
