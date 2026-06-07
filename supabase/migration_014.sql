-- Migration 014: datum_text column for display-friendly date string
alter table media add column if not exists datum_text text;
