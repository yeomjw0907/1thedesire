# STI 기능 DB 스키마 및 접근권한 검토안

## 목적
- `최근 STI 검사 확인` 기능을 구현할 때 필요한 최소 데이터 구조와 권한 모델을 정리한다.
- 기준은 `민감정보 최소 저장`, `원본 비장기보관`, `운영 감사 가능`, `공개 정보 최소화`다.

## 결론
- 이 기능은 기존 `profiles` 테이블에 칼럼 몇 개 추가해서 처리하면 안 된다.
- 공개용 상태 데이터, 운영 감사 로그, 제출물 임시 저장 영역을 분리해야 한다.
- 특히 원본 제출물은 일반 서비스 데이터와 같은 권한 모델에 두면 안 된다.

## 1. 권장 데이터 구조

### 공개용 상태 테이블
```sql
create table public.sti_check_badges (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verification_status text not null check (verification_status in ('none', 'pending', 'verified', 'rejected', 'expired', 'revoked')),
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

### 운영 감사 로그
```sql
create table public.sti_check_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

### 제출 세션 관리 테이블
```sql
create table public.sti_check_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'under_review', 'approved', 'rejected', 'deleted')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id),
  expires_at timestamptz,
  notes text
);
```

## 2. 저장 금지 원칙

### DB에 넣지 말아야 하는 항목
- 세부 질환별 양성/음성 결과
- 주민등록번호
- 병원 원문 전체 텍스트
- 이미지 OCR 원문
- 기타 병력, 약 복용 이력

### 이유
- 공개 범위를 넓히지 않기 위해서다.
- 기능 목적은 `최근 검사 확인 배지`이지 의료기록 저장이 아니다.

## 3. 원본 제출물 저장 방식

### 권장안
- 제출물은 별도 비공개 스토리지 버킷에 일시 저장
- 검수 완료 후 즉시 삭제
- DB에는 파일 경로를 장기 보관하지 않음

### 차선안
- 분쟁 대응이 필요하면 매우 짧은 기간의 암호화 임시 보관
- 기간 만료 시 자동 파기 작업 필수

### 비권장안
- 공개 버킷 저장
- 일반 게시물 이미지 버킷 재사용
- 무기한 보관

## 4. 권한 모델

### 사용자 권한
- 본인 배지 상태 조회 가능
- 본인 공개 여부 변경 가능
- 본인 제출 신청 가능
- 원본 재열람은 기본적으로 미제공 또는 제한 제공

### 일반 사용자 권한
- 다른 사람의 공개 배지 상태만 조회 가능
- 조회 가능 항목
- 배지 존재 여부
- 검사일
- 유효기간

### 운영자 권한
- 검수 대기 목록 조회
- 승인/반려/철회 처리
- 감사 로그 조회
- 원본 제출물 접근은 최소 인원만 허용

### 개발자/운영 인프라 권한
- 서비스 일반 관리자와 민감정보 검수 관리자를 분리
- `service_role` 남용 금지
- 가능한 경우 STI 전용 서버 액션 또는 전용 RPC 사용

## 5. RLS 권장 방향

### `sti_check_badges`
- 본인: 전체 조회/공개 설정 수정 가능
- 타인: `is_public = true` 이고 `verification_status = 'verified'` 인 최소 필드만 조회 가능

### `sti_check_submissions`
- 본인: 본인 제출 상태만 조회
- 운영자: 검수 권한자만 조회
- 일반 사용자: 접근 금지

### `sti_check_audit_logs`
- 운영자만 조회
- 일반 사용자 접근 금지

## 6. 상태 머신 권장안

### 제출 상태
- `none`
- `pending`
- `under_review`
- `verified`
- `rejected`
- `expired`
- `revoked`

### 전이 규칙
- `none -> pending`
- `pending -> under_review`
- `under_review -> verified | rejected`
- `verified -> expired | revoked`
- `rejected -> pending`

## 7. 자동화가 필요한 작업

### 크론/배치
- 만료일 경과 시 `verified -> expired`
- 원본 파일 삭제 작업
- 철회 시 공개 배지 즉시 숨김

### 알림
- 검수 완료 알림
- 만료 예정 알림
- 만료 알림

## 8. 보안 설계 체크포인트
- STI 제출 파일은 별도 버킷
- 버킷은 public 금지
- 파일 URL 직접 노출 금지
- 운영자 접근 로그 남기기
- 제출 파일명에 개인정보 포함 금지
- 다운로드 권한은 짧은 만료 signed URL만 허용

## 9. 기존 구조와의 연결 포인트
- `profiles`에는 공개 배지 집계용 최소 참조값만 둘 수 있음
- 예: `has_sti_badge boolean`
- 하지만 진실 소스는 `sti_check_badges` 여야 한다.

## 10. 권장 결론
- `profiles` 확장 방식보다 STI 전용 테이블 분리가 맞다.
- 공개 데이터와 검수 데이터를 분리해야 한다.
- 원본은 스토리지 임시 저장 후 삭제가 기본이다.

## 다음 작업
- 관리자 화면 흐름은 [5-sti-ops-review-process.md](/Users/yeomj/OneDrive/Desktop/욕망백서/docs/review/5-sti-ops-review-process.md) 기준으로 설계
- 공개 UX는 [6-sti-ux-copy-and-risk.md](/Users/yeomj/OneDrive/Desktop/욕망백서/docs/review/6-sti-ux-copy-and-risk.md) 기준으로 설계
