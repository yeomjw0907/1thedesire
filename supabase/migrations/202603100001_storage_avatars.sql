-- Supabase Storage: avatars 버킷 생성
-- 프로필 이미지 업로드용 공개 버킷 (프로필 페이지·회원가입 아바타)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 인증된 사용자: 자신의 폴더(user_id)에만 업로드 가능
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 읽기 (프로필/채팅에서 이미지 노출)
create policy "avatars_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

-- 본인 아바타만 삭제 가능
create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
