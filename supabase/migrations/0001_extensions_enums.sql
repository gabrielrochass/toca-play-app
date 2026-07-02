-- 0001 — Extensions & enums
-- TocaPlay check-in app. Foundational types shared by all later migrations.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- trigram fuzzy search on teen name / display_id

do $$ begin
  create type sex as enum ('M', 'F');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_status as enum ('present', 'authorized_to_leave', 'left');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('global_admin', 'unit_admin', 'volunteer');
exception when duplicate_object then null; end $$;
