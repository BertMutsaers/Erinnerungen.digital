-- Migration 009: allow update on demo books (owner_id IS NULL)
create policy "public_update_demo_books" on books
  for update using (owner_id is null);
