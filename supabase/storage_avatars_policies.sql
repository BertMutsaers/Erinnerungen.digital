-- Storage policies for the 'avatars' bucket
-- Bucket must be created manually in Supabase Dashboard (Storage → New bucket, public: true)

-- Authenticated users may only upload/overwrite their own avatar (path: <uid>/avatar.jpg)
create policy "own_avatar_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own_avatar_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read — required for getPublicUrl() to work without auth
create policy "public_avatar_read" on storage.objects
  for select using (bucket_id = 'avatars');
