-- Allow public read access to demo books (owner_id IS NULL)
-- and their associated memories/media. Remove once auth is in place.

create policy "public_read_demo_books" on books
  for select using (owner_id is null);

create policy "public_read_demo_memories" on memories
  for select using (
    book_id in (select id from books where owner_id is null)
  );

create policy "public_read_demo_media" on media
  for select using (
    memory_id in (
      select m.id from memories m
      join books b on b.id = m.book_id
      where b.owner_id is null
    )
  );
