-- Migration 011: unified media table (foto, video, audio, dokument)
-- Note: drops old unused 'media' table from initial schema (had memory_id, was never used)

drop table if exists media cascade;

create table media (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  book_id       uuid references books(id) on delete cascade not null,
  typ           text check (typ in ('foto','video','audio','dokument')) not null,
  url           text not null,
  thumbnail_url text,
  storage_path  text,
  titel         text,
  beschreibung  text,
  datum_jahr    int,
  groesse       text check (groesse in ('normal','wide','tall')) default 'normal',
  dateigroesse  int,
  sortierung    int default 0
);

alter table media enable row level security;

create policy "public_read_demo_media"   on media for select  using      (book_id in (select id from books where owner_id is null));
create policy "public_insert_demo_media" on media for insert  with check (book_id in (select id from books where owner_id is null));
create policy "public_update_demo_media" on media for update  using      (book_id in (select id from books where owner_id is null));
create policy "public_delete_demo_media" on media for delete  using      (book_id in (select id from books where owner_id is null));

-- Storage bucket
insert into storage.buckets (id, name, public) values ('media-files', 'media-files', true) on conflict (id) do nothing;

create policy "public read media-files"   on storage.objects for select using      (bucket_id = 'media-files');
create policy "public insert media-files" on storage.objects for insert with check (bucket_id = 'media-files');
create policy "public update media-files" on storage.objects for update using      (bucket_id = 'media-files');
create policy "public delete media-files" on storage.objects for delete using      (bucket_id = 'media-files');

-- Migrate photos if the photos table exists and has data
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'photos' and table_schema = 'public') then
    insert into media (book_id, typ, url, storage_path, groesse, sortierung, created_at)
    select book_id, 'foto', foto_url, storage_path, groesse, sort_order, created_at
    from photos;
  end if;
end $$;
