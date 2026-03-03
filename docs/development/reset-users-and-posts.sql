-- ============================================================
-- 사용자·게시물 완전 초기화 (복구 불가)
-- ============================================================
-- 실행 위치: Supabase 대시보드 > SQL Editor
-- 주의: 한 번 실행하면 사용자·게시물·채팅·좋아요·알림 등이 모두 삭제됩니다.
--       Storage(게시 이미지, 아바타)는 이 스크립트로 지워지지 않습니다.
-- ============================================================

-- 1. public.profiles 삭제 (CASCADE로 posts, chat_rooms, post_likes, notifications 등 연쇄 삭제)
TRUNCATE TABLE public.profiles RESTART IDENTITY CASCADE;

-- 2. Auth 사용자 전체 삭제
DELETE FROM auth.users;

-- 완료 후: Storage 버킷(post-images, avatars 등)에 남은 파일은
-- 대시보드 > Storage에서 수동 삭제하세요.
