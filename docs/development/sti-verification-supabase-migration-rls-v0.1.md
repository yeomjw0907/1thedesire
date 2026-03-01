# STI Verification Supabase Migration & RLS Draft v0.1

> **카피 기준**: 사용자 노출 문구는 [recent-check-copy-system-v0.1.md](recent-check-copy-system-v0.1.md)를 따른다.

## 목적
- `최근검사 확인` 기능에 필요한 Supabase DB / Storage / RLS 초안을 정의한다.
- 이 문서는 실제 migration 작성 전 설계 기준이다.

## 구성 범위
- enum/check 제약
- 테이블
- 인덱스
- updated_at 트리거
- storage bucket
- RLS 정책 방향
- cron 대상 작업

## 1. 신규 테이블

### 1-1. `sti_check_badges`
```sql
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
```

### 1-2. `sti_check_submissions`
```sql
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
```

### 1-3. `sti_check_audit_logs`
```sql
create table if not exists public.sti_check_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.sti_check_submissions(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## 2. 인덱스
```sql
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
```

## 3. 보조 트리거

### `sti_check_badges.updated_at`
```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sti_check_badges_updated_at on public.sti_check_badges;

create trigger trg_sti_check_badges_updated_at
before update on public.sti_check_badges
for each row
execute function public.set_updated_at();
```

## 4. 기본 비즈니스 규칙

### badge row 생성 규칙
- 사용자가 첫 제출 시 badge row가 없으면 생성
- 이후에는 동일 user row 갱신

### 제출 중복 규칙
- `pending` 또는 `under_review` submission 이 존재하면 새 submission 생성 금지
- 이 검증은 server action 또는 RPC 에서 강제

### 공개 노출 규칙
- 프로필 배지 노출 조건
```text
verification_status = 'verified'
and is_public = true
and expires_at > now()
```

## 5. Storage 초안

### bucket
```sql
insert into storage.buckets (id, name, public)
values ('sti-verification-private', 'sti-verification-private', false)
on conflict (id) do nothing;
```

### 경로 규칙
```text
sti-verification-private/{user_id}/{submission_id}/{uuid}.jpg
```

### 원칙
- public URL 금지
- signed URL 만 허용
- 승인/반려 후 삭제

## 6. RLS 활성화
```sql
alter table public.sti_check_badges enable row level security;
alter table public.sti_check_submissions enable row level security;
alter table public.sti_check_audit_logs enable row level security;
```

## 7. RLS 초안

### 7-1. `sti_check_badges`

### 본인 조회
```sql
create policy "sti_badges_select_own"
on public.sti_check_badges
for select
to authenticated
using (user_id = auth.uid());
```

### 공개 badge 최소 조회
주의:
- Supabase RLS 는 컬럼 단위 제한이 아니라 row 단위 제한이다.
- 따라서 공개 API에서 세부 컬럼 노출을 막으려면 `view` 또는 서버 레이어로 최소 필드를 제어하는 것이 더 안전하다.

```sql
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
```

### 본인 공개 설정 변경
```sql
create policy "sti_badges_update_visibility_own"
on public.sti_check_badges
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

주의:
- 이 정책만 두면 본인이 상태값까지 바꿀 수 있다.
- 따라서 실제 구현은
- 1. RLS update 를 닫고 server action + service_role 로만 처리하거나
- 2. DB trigger 로 수정 가능 컬럼을 `is_public` 으로 제한해야 한다.

권장:
- 일반 사용자의 direct update 는 막고 server action 에서 `is_public` 만 갱신

### 7-2. `sti_check_submissions`

### 본인 제출 조회
```sql
create policy "sti_submissions_select_own"
on public.sti_check_submissions
for select
to authenticated
using (user_id = auth.uid());
```

### 본인 제출 생성
```sql
create policy "sti_submissions_insert_own"
on public.sti_check_submissions
for insert
to authenticated
with check (user_id = auth.uid());
```

### 일반 사용자의 수정 금지
- update/delete 정책은 생성하지 않음

### 7-3. `sti_check_audit_logs`
- 일반 사용자 접근 금지
- select policy 없음
- 운영자 또는 service_role 만 접근

## 8. Storage RLS 방향

### 일반 사용자
- 본인 업로드만 허용
- 본인 제출 중인 파일에 한해 제한적 읽기 허용 가능

### 운영자
- 직접 storage policy 로 운영자 판단을 넣기보다 signed URL 발급을 서버 액션에서 제어하는 편이 안전

### 권장안
- storage.objects 직접 select 정책 최소화
- 파일 열람은 admin server action 에서만 signed URL 발급

## 9. Admin 권한 모델

## 현재 프로젝트 기준
- admin 은 `ADMIN_EMAILS` 로 구분 중

## STI 기능 권장
- admin server action 에서만 승인/반려 처리
- DB 레벨에서는 service_role 사용
- 장기적으로는 별도 admin role table 권장

## 10. server action / RPC 권장 매핑

### `createStiVerificationSubmission`
처리:
- 본인 인증 확인
- 중복 submission 검사
- submission insert
- badge upsert to `pending`
- audit log insert

### `approveStiVerificationSubmission`
처리:
- admin 확인
- submission `approved`
- badge `verified`
- `verified_at`, `expires_at`, `test_date` 저장
- audit log insert

### `rejectStiVerificationSubmission`
처리:
- admin 확인
- submission `rejected`
- badge `rejected`
- rejection_reason 저장
- audit log insert

### `setStiBadgeVisibility`
처리:
- 본인만 가능
- `verified` 상태 확인
- `is_public` 변경
- audit log insert

### `revokeStiVerification`
처리:
- 본인 또는 admin
- badge `revoked`
- `is_public = false`
- audit log insert

## 11. 프로필 조회 최적화용 view 제안

### 목적
- 공개용 최소 필드만 조회하도록 강제

```sql
create or replace view public.public_sti_badges as
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
```

권장:
- 일반 프로필 화면은 이 view 또는 서버에서 선별한 필드만 사용

## 12. 만료 처리 SQL 초안

### 크론 대상 update
```sql
update public.sti_check_badges
set
  verification_status = 'expired',
  is_public = false,
  updated_at = now()
where verification_status = 'verified'
  and expires_at is not null
  and expires_at <= now();
```

### audit log 는 application layer 또는 stored procedure 에서 함께 기록 권장

## 13. 마이그레이션 파일 제안
```text
supabase/migrations/202603010101_create_sti_verification_tables.sql
supabase/migrations/202603010102_create_sti_verification_storage.sql
supabase/migrations/202603010103_create_sti_verification_policies.sql
```

## 14. 주의사항
- RLS 만으로 컬럼 제한까지 완전히 해결하려 하지 말 것
- 공개용 데이터는 view 또는 서버 레이어에서 최소화할 것
- 운영자 원본 파일 접근은 storage policy 보다 signed URL 발급 레이어에서 통제할 것
- 일반 유저가 `verification_status` 를 직접 update 하지 못하게 할 것

## 15. 구현 우선순위
1. 신규 테이블 3종
2. private bucket
3. submission insert action
4. admin approve/reject action
5. public badge view
6. expiry cron
7. audit log 보강
