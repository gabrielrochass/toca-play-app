-- 0002 — Core tables
-- Multi-tenant by unit_id. Composite unique keys (unit_id, id) let child tables
-- use composite FKs so a row can never reference another unit's data.

-- Units (the 3 church campuses) --------------------------------------------
create table units (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code in ('BV', 'CF', 'RA')),  -- teen-id prefix
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Profiles (links auth.users -> unit + role) --------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  unit_id    uuid references units(id),
  role       app_role not null default 'volunteer',
  full_name  text not null,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_required_for_scoped_roles
    check (role = 'global_admin' or unit_id is not null)
);
create index profiles_unit_idx on profiles (unit_id);

-- Per-unit counter feeding the human-readable teen id (CF-0042) --------------
create table teen_id_counters (
  unit_id  uuid primary key references units(id) on delete cascade,
  next_seq integer not null default 1
);

-- Teens (pre-adolescents) ---------------------------------------------------
create table teens (
  id             uuid primary key default gen_random_uuid(),
  unit_id        uuid not null references units(id),
  seq            integer not null,          -- raw per-unit sequence (set by trigger)
  display_id     text not null,             -- 'CF-0042' (set by trigger)
  name           text not null,
  birthdate      date not null,             -- age is always computed, never stored
  sex            sex  not null,
  guardian_name  text not null,
  guardian_phone text not null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (unit_id, seq),
  unique (unit_id, display_id),
  unique (unit_id, id)                       -- composite FK target
);
create index teens_name_trgm     on teens using gin (name gin_trgm_ops);
create index teens_display_trgm  on teens using gin (display_id gin_trgm_ops);
create index teens_unit_active   on teens (unit_id, is_active);
create index teens_unit_created  on teens (unit_id, created_at);
create index teens_cohort        on teens (unit_id, sex, birthdate);

-- Service slots per unit (the culto times). Seeded per church; each unit has
-- its own set (e.g. CF/RA: 10h, 17h; BV: 10h, 16h, 18h30). Replaces the old
-- fixed manha/tarde shift so churches with different schedules are supported.
create table unit_services (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references units(id),
  label      text not null,          -- display label, e.g. '10h', '18h30'
  start_time time not null,
  sort_order smallint not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_id, id)                -- composite FK target
);
create index unit_services_unit on unit_services (unit_id, sort_order);

-- Sessions (cultos: an actual occurrence on a date + service) ----------------
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references units(id),
  session_date date not null,
  service_id   uuid not null,
  notes        text,
  closed_at    timestamptz,               -- null = aberto; set quando o culto encerra
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  foreign key (unit_id, service_id) references unit_services (unit_id, id),
  unique (unit_id, session_date, service_id),  -- one culto per date+service+unit
  unique (unit_id, id)                          -- composite FK target
);
create index sessions_unit_date on sessions (unit_id, session_date desc);

-- Check-ins (teen <-> session + exit state machine) -------------------------
create table checkins (
  id                 uuid primary key default gen_random_uuid(),
  unit_id            uuid not null references units(id),
  session_id         uuid not null,
  teen_id            uuid not null,
  status             checkin_status not null default 'present',
  check_in_time      timestamptz not null default now(),
  authorized_at      timestamptz,
  authorized_by      uuid references profiles(id),   -- volunteer who released
  authorized_by_name text,                            -- free-text fallback
  check_out_time     timestamptz,
  checked_in_by      uuid references profiles(id),
  created_at         timestamptz not null default now(),
  unique (session_id, teen_id),                       -- no double check-in
  foreign key (unit_id, session_id) references sessions (unit_id, id),
  foreign key (unit_id, teen_id)    references teens    (unit_id, id),
  -- state-machine invariants, enforced by the DB:
  constraint chk_present  check (status <> 'present'
    or (authorized_at is null and check_out_time is null)),
  constraint chk_authorized check (status <> 'authorized_to_leave'
    or (authorized_at is not null and check_out_time is null)),
  constraint chk_left     check (status <> 'left'
    or (authorized_at is not null and check_out_time is not null))
);
create index checkins_session   on checkins (session_id);
create index checkins_teen      on checkins (teen_id);
create index checkins_unit_time on checkins (unit_id, check_in_time);

-- Volunteers ----------------------------------------------------------------
create table volunteers (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references units(id),
  profile_id uuid references profiles(id),   -- optional link if they also log in
  name       text not null,
  phone      text,
  sex        sex,                             -- for matching a group leader by sex
  birthdate  date,                            -- for matching a group leader by age
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_id, id)
);
create index volunteers_unit_active on volunteers (unit_id, is_active);

-- Small groups (formed per session from checked-in teens) --------------------
create table small_groups (
  id               uuid primary key default gen_random_uuid(),
  unit_id          uuid not null references units(id),
  session_id       uuid not null,
  label            text,
  sex              sex,
  volunteer_id     uuid,                              -- responsible leader
  outside_age_rule boolean not null default false,   -- flagged deviation (age spread > 3)
  created_at       timestamptz not null default now(),
  foreign key (unit_id, session_id)   references sessions   (unit_id, id),
  foreign key (unit_id, volunteer_id) references volunteers (unit_id, id),
  unique (unit_id, id)
);
create index small_groups_session on small_groups (session_id);

create table small_group_members (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null,
  group_id          uuid not null,
  checkin_id        uuid not null references checkins(id) on delete cascade,
  assigned_manually boolean not null default false,
  created_at        timestamptz not null default now(),
  foreign key (unit_id, group_id) references small_groups (unit_id, id) on delete cascade,
  unique (checkin_id)                                 -- a check-in is in at most one group
);
create index sgm_group on small_group_members (group_id);

create table volunteer_attendance (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null,
  session_id   uuid not null,
  volunteer_id uuid not null,
  present      boolean not null default true,
  created_at   timestamptz not null default now(),
  foreign key (unit_id, session_id)   references sessions   (unit_id, id),
  foreign key (unit_id, volunteer_id) references volunteers (unit_id, id),
  unique (session_id, volunteer_id)
);
create index va_session   on volunteer_attendance (session_id);
create index va_volunteer on volunteer_attendance (volunteer_id);

-- keep updated_at fresh -----------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_teens_updated
  before update on teens
  for each row execute function set_updated_at();

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function set_updated_at();
