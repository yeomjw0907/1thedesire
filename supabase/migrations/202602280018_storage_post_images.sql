-- Supabase Storage: post-images 버킷 생성
-- 게시글 이미지 업로드용 공개 버킷

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- 인증된 사용자: 자신의 폴더에만 업로드 가능
create policy "post_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 읽기
create policy "post_images_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'post-images');

-- 본인 이미지 삭제
create policy "post_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
