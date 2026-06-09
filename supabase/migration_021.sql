-- Migration 021: RLS policies for authenticated users' own projects

-- Stories
create policy "user_own_stories" on stories
  for all using (
    book_id in (select id from books where owner_id = auth.uid())
  );

-- Memories
create policy "user_own_memories" on memories
  for all using (
    book_id in (select id from books where owner_id = auth.uid())
  );

-- Media
create policy "user_own_media" on media
  for all using (
    book_id in (select id from books where owner_id = auth.uid())
  );

-- Albums
create policy "user_own_albums" on albums
  for all using (
    book_id in (select id from books where owner_id = auth.uid())
  );

-- Books (own books)
create policy "user_own_books" on books
  for all using (owner_id = auth.uid());

-- Projects
create policy "user_own_projects" on projects
  for all using (user_id = auth.uid());
