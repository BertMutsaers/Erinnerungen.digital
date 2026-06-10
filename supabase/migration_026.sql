-- Migration 026: share_active flag — Token bleibt erhalten, nur Sichtbarkeit wird umgeschaltet

-- 1. Neue Spalte
alter table projects
  add column if not exists share_active boolean not null default false;

-- Bestehende Zeilen mit Token → als aktiv markieren
update projects set share_active = true where share_token is not null;

-- 2. RPCs aktualisieren: prüfen jetzt zusätzlich share_active = true

create or replace function public.get_project_by_share_token(p_token text)
returns setof projects
language sql security definer set search_path = public as $$
  select * from projects
  where share_token = p_token
    and share_token is not null
    and share_active = true;
$$;

create or replace function public.book_id_for_share_token(p_token text)
returns uuid
language sql security definer set search_path = public as $$
  select b.id
  from books b
  join projects p on p.id = b.project_id
  where p.share_token = p_token
    and p.share_token is not null
    and p.share_active = true
  limit 1;
$$;

-- Die Content-RPCs (memories/stories/media/albums) brauchen keine Änderung,
-- da sie über book_id_for_share_token gehen, das nun share_active prüft.
