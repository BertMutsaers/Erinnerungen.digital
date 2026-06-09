-- Migration 024: profiles — add missing columns that may not exist in the live DB

alter table profiles
  add column if not exists vorname      text,
  add column if not exists nachname     text,
  add column if not exists anzeigename  text,
  add column if not exists avatar_url   text,
  add column if not exists updated_at   timestamptz default now();
