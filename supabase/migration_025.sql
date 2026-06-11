-- Migration 025: share_token auf projects + SECURITY DEFINER read functions

-- 1. Token-Felder auf projects
alter table projects
  add column if not exists share_token text unique,
  add column if not exists shared_at   timestamptz;

-- Schneller Index für Token-Lookups
create index if not exists idx_projects_share_token
  on projects (share_token)
  where share_token is not null;

-- 2. SECURITY DEFINER-Funktion: Projekt per Token lesen
--    Gibt NUR die passende Zeile zurück, wenn Token != NULL und exakt übereinstimmt.
create or replace function public.get_project_by_share_token(p_token text)
returns setof projects
language sql security definer set search_path = public as $$
  select * from projects
  where share_token = p_token
    and share_token is not null;
$$;

-- 3. Hilfsfunktion: book_id aus Token auflösen (intern)
create or replace function public.book_id_for_share_token(p_token text)
returns uuid
language sql security definer set search_path = public as $$
  select b.id
  from books b
  join projects p on p.id = b.project_id
  where p.share_token = p_token
    and p.share_token is not null
  limit 1;
$$;

-- 4. SECURITY DEFINER-Funktionen für Inhalte
create or replace function public.get_memories_by_share_token(p_token text)
returns setof memories
language sql security definer set search_path = public as $$
  select m.* from memories m
  where m.book_id = public.book_id_for_share_token(p_token);
$$;

create or replace function public.get_stories_by_share_token(p_token text)
returns setof stories
language sql security definer set search_path = public as $$
  select s.* from stories s
  where s.book_id = public.book_id_for_share_token(p_token);
$$;

create or replace function public.get_media_by_share_token(p_token text)
returns setof media
language sql security definer set search_path = public as $$
  select m.* from media m
  where m.book_id = public.book_id_for_share_token(p_token);
$$;

create or replace function public.get_albums_by_share_token(p_token text)
returns setof albums
language sql security definer set search_path = public as $$
  select a.* from albums a
  where a.book_id = public.book_id_for_share_token(p_token);
$$;
