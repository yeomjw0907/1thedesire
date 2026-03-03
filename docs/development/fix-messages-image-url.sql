-- messages.image_url 컬럼 및 이미지 메시지 타입 추가
-- "column messages.image_url does not exist" 오류 해결용
-- Supabase 대시보드 > SQL Editor에서 이 스크립트를 실행하세요.

-- 1. image_url 컬럼 추가
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. message_type에 'image' 허용 (기존 제약 제거 후 재설정)
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'system', 'image'));
