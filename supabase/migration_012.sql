-- Migration 012: change sortierung to bigint (Date.now() overflows integer)
alter table media    alter column sortierung type bigint;
alter table stories  alter column sort_order type bigint;
alter table photos   alter column sort_order type bigint;
