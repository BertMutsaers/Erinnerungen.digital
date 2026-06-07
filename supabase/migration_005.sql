-- Migration 005: user-overridable card_color column
alter table memories add column if not exists card_color text
  check (card_color in ('weiss','gold','rose','blau','schwarz'));
