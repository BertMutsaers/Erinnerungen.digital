-- Migration 003: allow insert/update/delete on demo books (owner_id IS NULL)
-- and add body_extra column if not yet present

alter table memories add column if not exists body_extra text;

create policy "public_write_demo_memories" on memories
  for insert with check (
    book_id in (select id from books where owner_id is null)
  );

create policy "public_update_demo_memories" on memories
  for update using (
    book_id in (select id from books where owner_id is null)
  );
