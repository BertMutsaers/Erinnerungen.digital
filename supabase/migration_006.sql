-- Migration 006: track manually-set card sizes
alter table memories
  add column if not exists groesse_manuell boolean default false;
