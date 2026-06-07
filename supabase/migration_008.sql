-- Migration 008: Storage bucket + policies for profile photos

insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', true)
  on conflict (id) do nothing;

create policy "public read profile-photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "public insert profile-photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos');

create policy "public update profile-photos"
  on storage.objects for update
  using (bucket_id = 'profile-photos');

create policy "public delete profile-photos"
  on storage.objects for delete
  using (bucket_id = 'profile-photos');
