-- STI Verification: Private Storage Bucket
-- 원본 제출 파일 저장용 비공개 버킷

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sti-verification-private',
  'sti-verification-private',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Storage 업로드 정책: 본인 폴더에만 업로드 허용
-- 경로 규칙: sti-verification-private/{user_id}/{submission_id}/{uuid}.{ext}
create policy "sti_storage_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sti-verification-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage 삭제 정책: service_role 만 가능 (직접 정책 없음 = 일반 사용자 삭제 금지)
-- 운영자 파일 열람: server action에서 signed URL 발급 (storage policy 아님)
