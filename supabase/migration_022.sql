-- Migration 022: updated_at trigger for memories
alter table memories add column if not exists updated_at timestamptz default now();

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists memories_updated_at on memories;
create trigger memories_updated_at
  before update on memories
  for each row execute function update_updated_at();
