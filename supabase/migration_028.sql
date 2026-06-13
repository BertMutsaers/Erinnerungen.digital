-- Migration 028: in_galerie — Galerie-Freigabe pro Erinnerungsbuch
--
-- Getrennt vom geheimen Teilen-Link (share_active).
-- in_galerie = true macht das EB für alle Besucher öffentlich auffindbar.
-- Regel: in_galerie ist nur wirksam wenn share_active = true ebenfalls gesetzt ist.
-- Wenn share_active auf false gesetzt wird, wird in_galerie automatisch zurückgesetzt.

-- 1. Neue Spalte
alter table projects
  add column if not exists in_galerie boolean not null default false;

-- 2. Trigger: in_galerie = false erzwingen wenn share_active = false gesetzt wird
create or replace function sync_galerie_on_share_disable()
returns trigger language plpgsql as $$
begin
  -- Wenn share_active von true auf false wechselt → in_galerie ebenfalls false
  if old.share_active = true and new.share_active = false then
    new.in_galerie := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_galerie_on_share_disable on projects;
create trigger trg_sync_galerie_on_share_disable
  before update on projects
  for each row execute function sync_galerie_on_share_disable();

-- 3. Sicherheitsnetz: bestehende Zeilen bereinigen
--    (in_galerie darf nicht true sein wenn share_active false ist)
update projects
  set in_galerie = false
  where in_galerie = true and share_active = false;

-- 4. SECURITY DEFINER RPC für die öffentliche Galerie
--    Gibt NUR EB zurück, bei denen in_galerie=true UND share_active=true.
--    Nur die für die Galerie-Karte nötigen Felder — keine privaten Daten (kein rohtext etc.).
--    Anon-Rolle darf die Funktion aufrufen (GRANT am Ende).
create or replace function public.get_galerie_entries()
returns table (
  share_token       text,
  titel             text,
  cover_url         text,
  typ               text,
  geburtsdatum_jahr integer,
  sterbedatum_jahr  integer,
  geburtsort        text
)
language sql
security definer
set search_path = public
as $$
  select
    share_token,
    titel,
    cover_url,
    typ,
    -- Jahreszahl aus geburtsdatum_text extrahieren (erste 4-stellige Zahl)
    case
      when geburtsdatum_text ~ '\d{4}'
      then (regexp_match(geburtsdatum_text, '\d{4}'))[1]::integer
      else null
    end as geburtsdatum_jahr,
    case
      when sterbedatum_text ~ '\d{4}'
      then (regexp_match(sterbedatum_text, '\d{4}'))[1]::integer
      else null
    end as sterbedatum_jahr,
    geburtsort
  from projects
  where in_galerie    = true
    and share_active  = true
    and share_token   is not null
  order by vorname asc nulls last;
$$;

-- Anon-Rolle darf get_galerie_entries() aufrufen
grant execute on function public.get_galerie_entries() to anon;
