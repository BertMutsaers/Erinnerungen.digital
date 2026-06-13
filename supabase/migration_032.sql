-- get_galerie_entries(): created_at ergänzen, damit die Startseite
-- die ältesten Erinnerungsbücher anzeigen kann. Sortierung der RPC bleibt
-- nach Vorname (für die /galerie-Seite); die Startseite sortiert selbst.

drop function if exists public.get_galerie_entries();

create or replace function public.get_galerie_entries()
returns table (
  share_token       text,
  titel             text,
  cover_url         text,
  typ               text,
  geburtsdatum_jahr integer,
  sterbedatum_jahr  integer,
  geburtsort        text,
  created_at        timestamptz
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
    geburtsort,
    created_at
  from projects
  where in_galerie    = true
    and share_active  = true
    and share_token   is not null
  order by vorname asc nulls last;
$$;

-- Anon-Rolle darf get_galerie_entries() aufrufen
grant execute on function public.get_galerie_entries() to anon;
