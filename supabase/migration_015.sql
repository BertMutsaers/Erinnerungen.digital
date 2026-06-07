-- Migration 015: albums table

create table albums (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  book_id     uuid references books(id) on delete cascade not null,
  titel       text not null,
  datum_text  text,
  datum_jahr  int,
  datum_monat int,
  datum_tag   int,
  cover_url   text,
  sortierung  bigint default 0
);

alter table albums enable row level security;

create policy "public_read_demo_albums"   on albums for select  using      (book_id in (select id from books where owner_id is null));
create policy "public_insert_demo_albums" on albums for insert  with check (book_id in (select id from books where owner_id is null));
create policy "public_update_demo_albums" on albums for update  using      (book_id in (select id from books where owner_id is null));
create policy "public_delete_demo_albums" on albums for delete  using      (book_id in (select id from books where owner_id is null));

-- Link media items to albums
alter table media add column if not exists album_id uuid references albums(id) on delete set null;
