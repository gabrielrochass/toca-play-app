-- 0013 — Stock / resources module (per unit). Products carry a minimum-quantity
-- threshold; an append-only movement log records every arrival/consumption.
-- Quantity is adjusted ONLY through record_stock_movement(), which does an
-- atomic UPDATE ... SET quantity = quantity + delta (row lock) so simultaneous
-- receptions across the 3 units / multiple devices can never lose an update.

create table products (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references units(id),
  name         text not null,
  category     text,
  unit_label   text not null default 'un',   -- 'un', 'kg', 'cx'…
  quantity     integer not null default 0,
  min_quantity integer not null default 0,   -- low-stock threshold
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (unit_id, id)                        -- composite FK target
);
create index products_unit_active on products (unit_id, is_active);

create trigger trg_products_updated
  before update on products
  for each row execute function set_updated_at();

create table stock_movements (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null,
  product_id uuid not null,
  delta      integer not null,               -- +entrada / -saída
  reason     text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  foreign key (unit_id, product_id) references products (unit_id, id) on delete cascade,
  unique (unit_id, id)
);
create index stock_movements_product on stock_movements (product_id, created_at desc);

-- Atomic stock adjustment: bump the running quantity AND log the movement in one
-- transaction. security invoker so the caller's RLS (own unit) applies — a
-- product in another unit is invisible, so the UPDATE matches no row and raises.
create or replace function public.record_stock_movement(
  p_product uuid, p_delta integer, p_reason text default null
)
returns products
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row products;
begin
  update products
     set quantity = quantity + p_delta
   where id = p_product
   returning * into v_row;          -- row lock serialises concurrent adjustments

  if v_row.id is null then
    raise exception 'Produto % não encontrado (ou fora da sua unidade)', p_product;
  end if;

  insert into stock_movements (unit_id, product_id, delta, reason, created_by)
  values (v_row.unit_id, p_product, p_delta, nullif(btrim(p_reason), ''), auth.uid());

  return v_row;
end $$;

grant execute on function public.record_stock_movement(uuid, integer, text) to authenticated;

-- RLS: read/insert/update within own unit for any authenticated user (reception
-- registers products & logs arrivals); delete gated to admins. Same template as
-- teens + can_manage() on delete.
alter table products         enable row level security; alter table products         force row level security;
alter table stock_movements  enable row level security; alter table stock_movements  force row level security;

create policy products_sel on products for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy products_ins on products for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy products_upd on products for update to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()))
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy products_del on products for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

create policy sm_sel on stock_movements for select to authenticated
  using ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy sm_ins on stock_movements for insert to authenticated
  with check ((select public.is_global_admin()) or unit_id = (select public.current_unit()));
create policy sm_del on stock_movements for delete to authenticated
  using ((select public.is_global_admin())
    or ((select public.can_manage()) and unit_id = (select public.current_unit())));

-- Live low-stock updates across devices.
alter publication supabase_realtime add table products;
