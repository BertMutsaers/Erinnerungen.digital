-- Migration 013: datum_monat + datum_tag auf media-Tabelle
alter table media add column if not exists datum_monat int;
alter table media add column if not exists datum_tag   int;
