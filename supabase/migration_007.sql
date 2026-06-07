-- Migration 007: photo URL column + Storage policies

alter table memories add column if not exists foto_url text;

-- Storage: allow anon read / insert / update / delete on memories-photos bucket
insert into storage.buckets (id, name, public)
  values ('memories-photos', 'memories-photos', true)
  on conflict (id) do nothing;

create policy "public read memories-photos"
  on storage.objects for select
  using (bucket_id = 'memories-photos');

create policy "public insert memories-photos"
  on storage.objects for insert
  with check (bucket_id = 'memories-photos');

create policy "public update memories-photos"
  on storage.objects for update
  using (bucket_id = 'memories-photos');

create policy "public delete memories-photos"
  on storage.objects for delete
  using (bucket_id = 'memories-photos');
