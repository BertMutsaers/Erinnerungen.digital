-- Migration 023: profiles — anzeigename + updated_at + auto-create trigger

-- Add new columns (idempotent)
alter table profiles
  add column if not exists anzeigename text,
  add column if not exists updated_at  timestamptz default now();

-- Keep updated_at current on every update
create or replace function update_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_profiles_updated_at();

-- Auto-create a profiles row for every new auth user
-- (fires after INSERT on auth.users, so new sign-ups get a profile immediately)
create or replace function create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, created_at, updated_at)
  values (new.id, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_profile_for_new_user();
