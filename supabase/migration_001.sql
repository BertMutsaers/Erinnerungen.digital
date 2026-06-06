-- Migration 001: flexible date fields, icon, kategorie, lg-black card size

-- Make owner_id nullable so seed data works without an auth user
alter table books alter column owner_id drop not null;

-- Make happened_at nullable (some dates are approximate: "Sommer 1933")
alter table memories alter column happened_at drop not null;

-- New columns on memories
alter table memories
  add column if not exists icon        text,
  add column if not exists kategorie   text,
  add column if not exists datum_label text,   -- display string: "Sommer 1933"
  add column if not exists datum_jahr  int,    -- for sorting
  add column if not exists datum_monat int,    -- 1–12, nullable
  add column if not exists datum_tag   int;    -- 1–31, nullable

-- Extend card_size check to include lg-black
alter table memories drop constraint if exists memories_card_size_check;
alter table memories add constraint memories_card_size_check
  check (card_size in ('small', 'medium', 'large', 'lg-black'));
