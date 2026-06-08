-- Migration 019: structured date fields for projects
alter table projects
  add column if not exists geburtsdatum_text   text,
  add column if not exists geburtsdatum_tag    int,
  add column if not exists geburtsdatum_monat  int,
  add column if not exists geburtsdatum_jahr   int,
  add column if not exists sterbedatum_text    text,
  add column if not exists sterbedatum_tag     int,
  add column if not exists sterbedatum_monat   int,
  add column if not exists sterbedatum_jahr    int;
