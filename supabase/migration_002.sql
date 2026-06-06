-- Migration 002: Zeitgeschehen-Spalte für KI-generierte Kontextinformation
alter table memories add column if not exists body_extra text;
