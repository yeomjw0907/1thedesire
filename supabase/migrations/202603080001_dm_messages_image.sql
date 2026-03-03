-- messages: 이미지 메시지 지원
alter table public.messages
  add column if not exists image_url text;

alter table public.messages
  drop constraint if exists messages_message_type_check;

alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'system', 'image'));

-- DM 이미지용 스토리지 버킷 (공개 읽기, 인증 업로드)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dm-images',
  'dm-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "dm_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dm-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dm_images_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'dm-images');

create policy "dm_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dm-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
