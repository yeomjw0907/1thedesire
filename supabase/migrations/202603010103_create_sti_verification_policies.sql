-- STI Verification: RLS 활성화 및 정책
-- 기준 문서: sti-verification-supabase-migration-rls-v0.1.md

-- RLS 활성화
alter table public.sti_check_badges enable row level security;
alter table public.sti_check_submissions enable row level security;
alter table public.sti_check_audit_logs enable row level security;

-- ─────────────────────────────────────────────
-- sti_check_badges 정책
-- ─────────────────────────────────────────────

-- 본인 배지 전체 조회
create policy "sti_badges_select_own"
on public.sti_check_badges
for select
to authenticated
using (user_id = auth.uid());

-- 타인 공개 배지 조회 (최소 row 노출, 컬럼 제한은 view/서버 레이어에서)
create policy "sti_badges_select_public_rows"
on public.sti_check_badges
for select
to authenticated
using (
  verification_status = 'verified'
  and is_public = true
  and expires_at is not null
  and expires_at > now()
);

-- 일반 사용자 direct update 금지
-- is_public 변경은 server action + service_role 에서만 처리
-- (update 정책을 두지 않음)

-- ─────────────────────────────────────────────
-- sti_check_submissions 정책
-- ─────────────────────────────────────────────

-- 본인 제출 조회
create policy "sti_submissions_select_own"
on public.sti_check_submissions
for select
to authenticated
using (user_id = auth.uid());

-- 본인 제출 생성
create policy "sti_submissions_insert_own"
on public.sti_check_submissions
for insert
to authenticated
with check (user_id = auth.uid());

-- 일반 사용자 update/delete 금지 (정책 없음)

-- ─────────────────────────────────────────────
-- sti_check_audit_logs 정책
-- ─────────────────────────────────────────────

-- 일반 사용자 접근 금지: 정책 없음
-- service_role 만 접근 가능 (server action 내부)
