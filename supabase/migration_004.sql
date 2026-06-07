-- Migration 004: allow delete on demo memories
create policy "public_delete_demo_memories" on memories
  for delete using (
    book_id in (select id from books where owner_id is null)
  );
