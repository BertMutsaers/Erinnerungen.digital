-- Migration 016: projects table + project_id on all tables

create table projects (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  user_id             uuid references auth.users(id) on delete cascade,
  typ                 text check (typ in ('mensch','firma','sonstiges')) not null default 'mensch',
  titel               text not null,
  untertitel          text,
  cover_url           text,
  -- Typ: Mensch
  vorname             text,
  nachname            text,
  geburtsdatum        date,
  geburtsort          text,
  sterbedatum         date,
  sterbeort           text,
  -- Typ: Firma
  firmenname          text,
  gruendungsjahr      int,
  branche             text,
  -- Typ: Sonstiges
  zeitraum_von        int,
  zeitraum_bis        int,
  zuletzt_bearbeitet  timestamptz default now()
);

alter table projects enable row level security;
create policy "Eigene Projekte" on projects for all using (auth.uid() = user_id);

-- Allow public read for demo project (user_id IS NULL)
create policy "public_read_demo_projects" on projects
  for select using (user_id is null);

-- Link existing tables to projects
alter table memories add column if not exists project_id uuid references projects(id) on delete cascade;
alter table stories  add column if not exists project_id uuid references projects(id) on delete cascade;
alter table media    add column if not exists project_id uuid references projects(id) on delete cascade;
alter table albums   add column if not exists project_id uuid references projects(id) on delete cascade;
alter table books    add column if not exists project_id uuid references projects(id) on delete cascade;

-- Profiles table for display names / avatars
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  vorname      text,
  nachname     text,
  avatar_url   text,
  created_at   timestamptz default now()
);
alter table profiles enable row level security;
create policy "Eigenes Profil" on profiles for all using (auth.uid() = id);

-- Seed: demo project for Piet (no user_id = public)
insert into projects (id, user_id, typ, titel, vorname, nachname, geburtsdatum, geburtsort, sterbedatum, sterbeort)
values (
  'c0000000-0000-0000-0000-000000000001',
  null,
  'mensch',
  'Piet Mutsaers',
  'Piet', 'Mutsaers',
  '1926-06-17', 'Tilburg',
  '1982-09-03', 'Osnabrück'
) on conflict (id) do nothing;

-- Link existing Piet data to demo project
update memories set project_id = 'c0000000-0000-0000-0000-000000000001'
  where book_id = 'a1b2c3d4-0000-0000-0000-000000000001' and project_id is null;

update stories set project_id = 'c0000000-0000-0000-0000-000000000001'
  where book_id = 'a1b2c3d4-0000-0000-0000-000000000001' and project_id is null;

update media set project_id = 'c0000000-0000-0000-0000-000000000001'
  where book_id = 'a1b2c3d4-0000-0000-0000-000000000001' and project_id is null;

update albums set project_id = 'c0000000-0000-0000-0000-000000000001'
  where book_id = 'a1b2c3d4-0000-0000-0000-000000000001' and project_id is null;

update books set project_id = 'c0000000-0000-0000-0000-000000000001'
  where id = 'a1b2c3d4-0000-0000-0000-000000000001' and project_id is null;
