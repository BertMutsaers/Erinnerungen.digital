-- erinnerungen.digital – Database Schema

-- Users / Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Memory books (one per user, or shared)
create table books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  cover_url text,
  created_at timestamptz default now()
);

-- Memories (individual cards on the timeline)
create table memories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  title text,
  body text,
  happened_at date not null,
  location text,
  card_size text check (card_size in ('small', 'medium', 'large')) default 'medium',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Media attachments (photos / audio)
create table media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references memories(id) on delete cascade not null,
  storage_path text not null,
  mime_type text,
  width int,
  height int,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Tags
create table tags (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  name text not null,
  color text default '#000000',
  unique(book_id, name)
);

create table memory_tags (
  memory_id uuid references memories(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (memory_id, tag_id)
);

-- People (tagged persons)
create table people (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  name text not null,
  avatar_url text,
  unique(book_id, name)
);

create table memory_people (
  memory_id uuid references memories(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  primary key (memory_id, person_id)
);

-- Row-level security
alter table profiles enable row level security;
alter table books enable row level security;
alter table memories enable row level security;
alter table media enable row level security;
alter table tags enable row level security;
alter table memory_tags enable row level security;
alter table people enable row level security;
alter table memory_people enable row level security;

-- Policies: owner can do everything
create policy "owner" on profiles for all using (id = auth.uid());
create policy "owner" on books for all using (owner_id = auth.uid());
create policy "owner" on memories for all using (
  book_id in (select id from books where owner_id = auth.uid())
);
create policy "owner" on media for all using (
  memory_id in (
    select m.id from memories m
    join books b on b.id = m.book_id
    where b.owner_id = auth.uid()
  )
);
create policy "owner" on tags for all using (
  book_id in (select id from books where owner_id = auth.uid())
);
create policy "owner" on memory_tags for all using (
  memory_id in (
    select m.id from memories m
    join books b on b.id = m.book_id
    where b.owner_id = auth.uid()
  )
);
create policy "owner" on people for all using (
  book_id in (select id from books where owner_id = auth.uid())
);
create policy "owner" on memory_people for all using (
  memory_id in (
    select m.id from memories m
    join books b on b.id = m.book_id
    where b.owner_id = auth.uid()
  )
);
