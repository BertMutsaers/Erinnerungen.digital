-- Migration 018: reduce project types to person / organisation

alter table projects drop constraint if exists projects_typ_check;
alter table projects add constraint projects_typ_check
  check (typ in ('person', 'organisation'));

-- add organisation fields
alter table projects add column if not exists art            text;
alter table projects add column if not exists gruendungsjahr int;   -- already exists for firma
alter table projects add column if not exists aufloesungsjahr int;

-- migrate existing data
update projects set typ = 'person'       where typ = 'mensch';
update projects set typ = 'organisation' where typ in ('firma', 'sonstiges');
