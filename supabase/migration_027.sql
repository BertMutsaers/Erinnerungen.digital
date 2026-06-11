-- Migration 027: rohtext-Feld für KI-Erstellungs-Flow
--
-- Speichert den freien Eingabetext aus der neuen EB-Maske.
-- Wird von der KI-Extraktion (Etappe B) gelesen und nach dem
-- Speichern des Zeitstrahls (Etappe D) bewusst NICHT gelöscht —
-- er bleibt als Quelldokument erhalten.

alter table projects
  add column if not exists rohtext text;
