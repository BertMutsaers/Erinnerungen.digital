-- Migration 029: card_color um 'gruen' erweitern
--
-- Die Check-Constraint aus migration_005 erlaubt nur die 5 alten Werte.
-- Wir ersetzen sie durch eine neue Constraint die auch 'gruen' einschließt.

alter table memories
  drop constraint if exists memories_card_color_check;

alter table memories
  add constraint memories_card_color_check
  check (card_color in ('weiss', 'gold', 'rose', 'blau', 'schwarz', 'gruen'));
