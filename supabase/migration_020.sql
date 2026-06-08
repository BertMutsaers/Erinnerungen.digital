-- Migration 020: fix books.owner_id to reference auth.users directly
-- (profiles has username NOT NULL which breaks upsert)

alter table books drop constraint if exists books_owner_id_fkey;
alter table books add constraint books_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;
