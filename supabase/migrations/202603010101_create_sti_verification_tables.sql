-- STI Verification: 테이블 3종 생성
-- 최근 STI 검사 확인 기능
-- 기준 문서: sti-verification-supabase-migration-rls-v0.1.md

-- 1. sti_check_badges: 사용자별 배지 상태 (1인 1행)
create table if not exists public.sti_check_badges (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verification_status text not null default 'none'
    check (verification_status in ('none', 'pending', 'under_review', 'verified', 'rejected', 'expired', 'revoked')),
  test_date date,
  expires_at timestamptz,
  verified_at timestamptz,
  verification_method text,
  is_public boolean not null default false,
  revoked_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. sti_check_submissions: 제출 이력 (복수 가능)
create table if not exists public.sti_check_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected', 'deleted')),
  test_date date not null,
  file_path text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. sti_check_audit_logs: 감사 로그
create table if not exists public.sti_check_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.sti_check_submissions(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_sti_check_badges_status
  on public.sti_check_badges (verification_status);

create index if not exists idx_sti_check_badges_expires_at
  on public.sti_check_badges (expires_at);

create index if not exists idx_sti_check_submissions_user_id
  on public.sti_check_submissions (user_id);

create index if not exists idx_sti_check_submissions_status_submitted_at
  on public.sti_check_submissions (status, submitted_at desc);

create index if not exists idx_sti_check_audit_logs_user_id_created_at
  on public.sti_check_audit_logs (user_id, created_at desc);

-- updated_at 트리거 (set_updated_at 함수는 202602280001에서 이미 생성됨)
drop trigger if exists trg_sti_check_badges_updated_at on public.sti_check_badges;

create trigger trg_sti_check_badges_updated_at
before update on public.sti_check_badges
for each row
execute function public.set_updated_at();

-- 공개용 최소 필드 뷰
-- security_invoker = on: 쿼리하는 사용자의 RLS 정책을 따름 (SECURITY DEFINER 방지)
create or replace view public.public_sti_badges
  with (security_invoker = on)
as
select
  user_id,
  test_date,
  expires_at,
  verified_at
from public.sti_check_badges
where verification_status = 'verified'
  and is_public = true
  and expires_at is not null
  and expires_at > now();
