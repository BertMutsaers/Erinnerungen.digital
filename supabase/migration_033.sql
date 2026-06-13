-- Migration 033: Aufräumen nach Entfernung des Demo-Features.
-- Entfernt verwaiste Demo-RLS-Policies und die ungenutzte Spalte projects.ist_demo.
-- Idempotent (drop ... if exists), kann gefahrlos erneut ausgeführt werden.

-- ── Demo-Policies (ist_demo-basiert) ─────────────────────────────────────────
drop policy if exists "Demo lesbar"          on projects;
drop policy if exists "Demo memories lesbar" on memories;
drop policy if exists "Demo stories lesbar"  on stories;
drop policy if exists "Demo media lesbar"    on media;
drop policy if exists "Demo albums lesbar"   on albums;

-- ── Ältere öffentliche Demo-Policies (owner_id is null / Demo-Projekte) ──────
drop policy if exists "public_read_demo_projects" on projects;
drop policy if exists "public_read_demo_books"    on books;
drop policy if exists "public_update_demo_books"  on books;

drop policy if exists "public_read_demo_memories"   on memories;
drop policy if exists "public_write_demo_memories"  on memories;
drop policy if exists "public_update_demo_memories" on memories;
drop policy if exists "public_delete_demo_memories" on memories;

drop policy if exists "public_read_demo_stories"   on stories;
drop policy if exists "public_write_demo_stories"  on stories;
drop policy if exists "public_update_demo_stories" on stories;
drop policy if exists "public_delete_demo_stories" on stories;

drop policy if exists "public_read_demo_media"   on media;
drop policy if exists "public_insert_demo_media" on media;
drop policy if exists "public_update_demo_media" on media;
drop policy if exists "public_delete_demo_media" on media;

drop policy if exists "public_insert_demo_albums" on albums;
drop policy if exists "public_update_demo_albums" on albums;
drop policy if exists "public_delete_demo_albums" on albums;

drop policy if exists "public_read_demo_photos"   on photos;
drop policy if exists "public_write_demo_photos"  on photos;
drop policy if exists "public_update_demo_photos" on photos;
drop policy if exists "public_delete_demo_photos" on photos;

-- ── Ungenutzte Spalte entfernen (nur fürs Demo-Flag verwendet) ───────────────
alter table projects drop column if exists ist_demo;
