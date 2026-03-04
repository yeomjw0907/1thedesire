-- 아바타/갤러리 업로드 용량 15MB로 상향 (기존 5MB)
update storage.buckets
set file_size_limit = 15728640
where id = 'avatars';
