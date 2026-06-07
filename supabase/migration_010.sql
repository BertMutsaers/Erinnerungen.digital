-- Migration 010: stories + photos tables

-- Stories
create table stories (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid references books(id) on delete cascade not null,
  titel       text not null,
  inhalt      text,
  tag         text,
  erzaehler   text,
  foto_url    text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

alter table stories enable row level security;

create policy "public_read_demo_stories" on stories
  for select using (book_id in (select id from books where owner_id is null));

create policy "public_write_demo_stories" on stories
  for insert with check (book_id in (select id from books where owner_id is null));

create policy "public_update_demo_stories" on stories
  for update using (book_id in (select id from books where owner_id is null));

create policy "public_delete_demo_stories" on stories
  for delete using (book_id in (select id from books where owner_id is null));

-- Photos
create table photos (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid references books(id) on delete cascade not null,
  storage_path  text not null,
  foto_url      text not null,
  beschriftung  text,
  jahr          int,
  groesse       text check (groesse in ('normal', 'wide', 'tall')) default 'normal',
  sort_order    int default 0,
  created_at    timestamptz default now()
);

alter table photos enable row level security;

create policy "public_read_demo_photos" on photos
  for select using (book_id in (select id from books where owner_id is null));

create policy "public_write_demo_photos" on photos
  for insert with check (book_id in (select id from books where owner_id is null));

create policy "public_update_demo_photos" on photos
  for update using (book_id in (select id from books where owner_id is null));

create policy "public_delete_demo_photos" on photos
  for delete using (book_id in (select id from books where owner_id is null));

-- Storage bucket for photos gallery
insert into storage.buckets (id, name, public)
  values ('gallery-photos', 'gallery-photos', true)
  on conflict (id) do nothing;

create policy "public read gallery-photos"
  on storage.objects for select using (bucket_id = 'gallery-photos');
create policy "public insert gallery-photos"
  on storage.objects for insert with check (bucket_id = 'gallery-photos');
create policy "public update gallery-photos"
  on storage.objects for update using (bucket_id = 'gallery-photos');
create policy "public delete gallery-photos"
  on storage.objects for delete using (bucket_id = 'gallery-photos');

-- Seed: 4 stories
insert into stories (id, book_id, titel, tag, erzaehler, inhalt, sort_order) values
(
  'b0000000-0000-0000-0001-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Das Fleischerhandwerk war mein Leben',
  'Handwerk',
  'Erzählt von Ruth Mutsaers · 1985',
  'Von der ersten Lehrstunde bei Roovers bis zum Meisterbrief in Landshut — Piet lebte und atmete sein Handwerk mit einer Leidenschaft die alle ansteckte.

Ruth erinnert sich: Er kam abends nach Hause und redete noch über die Schnittführung beim Fleisch. Das war keine Arbeit für ihn — das war Berufung.

Sein Kollege aus Düsseldorfer Tagen erzählte später: Piet war der Einzige von uns der frühmorgens als Erster in der Werkstatt war und abends als Letzter ging. Nicht weil er musste — sondern weil er wollte.',
  1
),
(
  'b0000000-0000-0000-0001-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Die Walz — allein durch Deutschland',
  'Wanderjahre',
  'Erinnerung von Bert Mutsaers',
  'Sommer 1951. Piet packt seinen Koffer, steckt den Gesellenbrief ein und fährt mit dem Zug nach Düsseldorf. Er kennt niemanden dort.

Erste Station: Fleischerei Matthias Schoelen. Dann Ernst Schäfer. Dann der Umzug nach Dissen, Iburg, schließlich nach Landshut.

Seine Schwester Riet erinnert sich: Er hat uns Postkarten geschickt. Eine aus Düsseldorf, eine aus Dissen. Kurze Texte: Es geht mir gut. Die Arbeit ist hart. Aber ich lerne.',
  2
),
(
  'b0000000-0000-0000-0001-000000000003',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Das Schützenfest in Dissen',
  'Liebe',
  'Erinnerung der Familie',
  '1957. Piet arbeitet seit Mai als Betriebsleiter bei Fa. Schulte in Dissen. Ein ruhiges Leben — bis zum Dissener Schützenfest.

Dort trifft er Ruth Bressau, die Apothekenhelferin. Sie tanzen. Sie reden. Ein Jahr später, am 21. April 1958, heiraten sie in Bad Rothenfelde.

Ruth sagt später: Er hat mich dreimal gefragt ob ich tanzen möchte. Beim dritten Mal habe ich ja gesagt. Piet habe nie mehr aufgehört zu fragen — in allem was er tat.',
  3
),
(
  'b0000000-0000-0000-0001-000000000004',
  'a1b2c3d4-0000-0000-0000-000000000001',
  '10 Millionen DM — und kein schlechter Schlaf',
  'Unternehmer',
  'Erzählt von Gabi Mutsaers',
  'April 1970. Piet unterschreibt einen Kreditvertrag über mehr als 10 Millionen Deutsche Mark. Die Familie ist in Sorge.

Schläfst du eigentlich noch? fragt Ruth ihn abends.

Besser als je zuvor, sagt Piet.

Er hatte gerechnet. Er hatte geplant. Anfang 1982, kurz vor seinem Tod, waren fast alle Schulden getilgt. Er hatte es geschafft.',
  4
);
