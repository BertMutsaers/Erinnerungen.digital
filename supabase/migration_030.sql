-- Migration 030: show_zeitgeschehen — Zeitgeschehen-Anzeige pro EB ein-/ausblenden
--
-- Variante B: Daten (body_extra) bleiben erhalten, werden aber nicht angezeigt.
-- Default true = Zeitgeschehen wird angezeigt (bisheriges Verhalten).

alter table projects
  add column if not exists show_zeitgeschehen boolean not null default true;
