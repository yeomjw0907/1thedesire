# STI Verification Feature Spec v0.1

> **카피 기준**: 사용자 노출 문구는 [recent-check-copy-system-v0.1.md](recent-check-copy-system-v0.1.md)를 따른다.
> 사용자 노출 메인명은 `최근검사 확인`이며, 설명 문구에서는 `최근 STI 검사 확인`으로 기능을 명시한다.

## 목적
- `최근검사 확인` 기능의 개발 명세를 정의한다.
- 이 기능은 `성병 없음 인증`이 아니다.
- 이 기능은 사용자의 최근 검사 확인 여부를 제한적으로 검증하고, 선택적으로 프로필에 표시하는 신뢰 기능이다.

## 제품 원칙
- 민감정보 최소 수집
- 원본 제출물 비장기보관
- 현재 상태 보증 금지
- 공개 여부는 사용자 선택
- 배지는 만료형
- 운영자 검수 기반 MVP

## 용어 정의
- `STI Verification`: 최근 STI 검사 확인 기능 전체
- `Badge`: 프로필에 노출되는 공개 배지
- `Submission`: 사용자가 검수를 위해 제출한 1회 단위 요청
- `Review`: 운영자 검수 행위

## 범위

### 포함
- 사용자 제출
- 민감정보 동의
- 공개 동의
- 운영자 승인/반려
- 프로필 배지 노출
- 만료 처리
- 철회 처리
- 감사 로그

### 제외
- 의료기관 API 직접 연동
- 자동 OCR 판독
- 세부 검사 항목 공개
- 병원 문서 장기 저장
- 유료화 로직

## 핵심 UX 요약
- 사용자는 `최근 STI 검사 확인` 기능 소개를 읽는다.
- 민감정보 수집·이용 동의와 공개 동의를 확인한다.
- 자료를 제출한다.
- 운영자가 검수한다.
- 승인 시 배지가 프로필에 노출된다.
- 배지는 만료일이 지나면 자동 숨김된다.
- 사용자는 언제든 공개를 철회할 수 있다.

## 상태 머신

### Badge Status
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
- `under_review -> verified`
- `under_review -> rejected`
- `verified -> expired`
- `verified -> revoked`
- `rejected -> pending`
- `expired -> pending`
- `revoked -> pending`

## 사용자 플로우

### 1. 제출 시작
1. 프로필 편집 또는 신뢰 섹션에서 `최근 STI 검사 확인` 진입
2. 기능 설명 및 주의 문구 노출
3. 민감정보 수집·이용 동의 체크
4. 공개 동의 체크
5. 제출 화면 진입

### 2. 제출
1. 검사일 입력
2. 검수용 제출물 업로드
3. 제출 버튼 클릭
4. 상태 `pending`
5. 사용자에게 `검수 중` 안내

### 3. 검수
1. 운영자가 대기열 확인
2. 제출물 열람
3. 승인 또는 반려
4. 승인 시 `verified`
5. 반려 시 `rejected`

### 4. 공개
1. `verified` 이고 `is_public = true` 이면 프로필에 배지 노출
2. 만료 시 자동 숨김
3. 사용자가 공개 철회 시 즉시 숨김

## 운영자 플로우

### 대기열
- `pending`, `under_review` 목록 조회
- 제출 시각, 사용자 ID, 공개 의사 여부, 검사일 표시

### 상세 검수
- 제출물 보기
- 체크리스트 확인
- 승인
- 반려
- 추가 메모 저장

### 사후 처리
- 승인 시 원본 삭제 확인
- 반려 사유 저장
- 감사 로그 기록

## 화면 목록

### 사용자 화면
1. 프로필 편집 내 STI 기능 진입 화면
2. 기능 설명/동의 화면
3. 제출 화면
4. 제출 완료 화면
5. 검수 중 상태 화면
6. 반려 상태 화면
7. 공개 중 상태 화면
8. 철회 확인 모달

### 운영자 화면
1. 제출 대기 리스트
2. 제출 상세 검수 화면
3. 승인/반려 처리 모달
4. 만료 예정 목록
5. 감사 로그 조회

## UI 문구 원칙

### 사용 가능 문구 (copy system 기준)
- 리스트/프로필 칩: `최근검사 확인`
- 설명: `최근 STI 검사 확인 정보를 공개한 프로필입니다`
- 경고: `검사 시점 기준 정보이며 현재 상태를 보증하지 않습니다`
- `검사일`
- `유효기간`

### 금지 문구
- `성병 없음 인증`
- `안전 인증`
- `무감염 보장`
- `안심 상대`
- `100% 안전`

## 상세 화면 명세

### A. 기능 소개 화면
- 제목: `최근검사 확인`
- 설명:
  - `최근 STI 검사 확인 정보를 프로필에 표시할 수 있습니다.`
  - `이 정보는 검사 시점 기준이며 현재 상태를 보증하지 않습니다.`
- 체크박스:
  - 민감정보 수집·이용 동의
  - 프로필 공개 동의

### B. 제출 화면
- 필드:
  - `test_date` 날짜 입력
  - `document_file` 파일 업로드
- 안내:
  - 허용 포맷
  - 검수 예상 시간
  - 검수 완료 후 원본 삭제 원칙

### C. 프로필 배지
- 노출 조건:
  - `verification_status = verified`
  - `is_public = true`
  - `expires_at > now()`
- 노출 문구:
  - `최근검사 확인`
  - `검사일 YYYY-MM-DD`
  - `YYYY-MM-DD까지 표시`

### D. 배지 상세 모달
- 제목: `최근검사 확인`
- 설명:
  - `이 프로필은 최근 STI 검사 확인 정보를 공개하고 있습니다.`
  - `검사 시점 기준의 정보이며 현재 상태를 보증하지 않습니다.`
  - `만남 전에는 대화와 보호수단 여부도 함께 확인해 주세요.`

## 데이터 모델

### 1. `sti_check_badges`
```sql
create table public.sti_check_badges (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verification_status text not null check (verification_status in ('none', 'pending', 'under_review', 'verified', 'rejected', 'expired', 'revoked')),
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

### 2. `sti_check_submissions`
```sql
create table public.sti_check_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'under_review', 'approved', 'rejected', 'deleted')),
  test_date date not null,
  file_path text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id),
  review_note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
```

### 3. `sti_check_audit_logs`
```sql
create table public.sti_check_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.sti_check_submissions(id) on delete set null,
  actor_id uuid references public.profiles(id),
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## 스토리지 정책

### 버킷
- 이름 예시: `sti-verification-private`
- public 금지
- signed URL 기반 접근만 허용

### 파일 정책
- 제출 직후 업로드
- 승인/반려 완료 후 즉시 삭제
- 최대 보관 기간을 두더라도 짧게 설정

### 파일명 정책
- 사용자 식별 가능한 텍스트 금지
- UUID 기반 경로 사용

## 권한 및 RLS

### 일반 사용자
- 본인 배지 상태 조회 가능
- 본인 제출 생성 가능
- 본인 공개 여부 수정 가능
- 타인의 공개 배지 최소 정보만 조회 가능

### 운영자
- 검수 대기 제출 조회 가능
- 승인/반려 가능
- 감사 로그 조회 가능

### 금지
- 일반 사용자의 제출물 원본 접근
- 공개 API에서 세부 검수 데이터 반환

## 권장 RLS 정책 방향

### `sti_check_badges`
- select:
  - 본인 전체 조회
  - 타인은 `is_public = true` + `verification_status = 'verified'` 인 경우 제한된 열만 조회
- update:
  - 본인은 `is_public` 철회만 가능
  - 상태 변경은 운영자 또는 서버 액션만 가능

### `sti_check_submissions`
- 본인:
  - 본인 제출의 상태만 조회
- 운영자:
  - 검수 권한이 있는 경우 조회/수정
- 일반 사용자:
  - 다른 사람 데이터 접근 금지

### `sti_check_audit_logs`
- 운영자만 조회

## 서버 액션 / API 계약

### 1. 제출 생성
- 이름 예시: `createStiVerificationSubmission`
- 입력:
  - `test_date`
  - `file`
  - `consent_sensitive`
  - `consent_public`
- 출력:
  - `submission_id`
  - `status`

### 2. 공개 설정 변경
- 이름 예시: `setStiBadgeVisibility`
- 입력:
  - `is_public`
- 제약:
  - `verified` 상태에서만 public true 허용

### 3. 철회
- 이름 예시: `revokeStiVerification`
- 입력:
  - `reason` optional
- 결과:
  - badge status `revoked`
  - 배지 숨김

### 4. 운영자 승인
- 이름 예시: `approveStiVerificationSubmission`
- 입력:
  - `submission_id`
  - `expires_at`
  - `review_note`
- 결과:
  - submission `approved`
  - badge `verified`

### 5. 운영자 반려
- 이름 예시: `rejectStiVerificationSubmission`
- 입력:
  - `submission_id`
  - `review_note`
- 결과:
  - submission `rejected`
  - badge `rejected`

## 유효기간 정책

### 권장안
- 기본 30일 또는 60일
- `expires_at` 지나면 자동 만료

### 크론 작업
- 이름 예시: `expire-sti-badges`
- 동작:
  - `verified` 중 만료된 건을 `expired` 로 업데이트
  - 공개 노출 중지
  - 감사 로그 기록

## 감사 로그 이벤트
- `submission_created`
- `submission_opened`
- `submission_approved`
- `submission_rejected`
- `badge_visibility_updated`
- `badge_revoked`
- `badge_expired`
- `source_file_deleted`

## 엣지 케이스

### 1. 제출 중복
- `pending` 또는 `under_review` 상태 제출이 있으면 새 제출 제한

### 2. 승인 후 재제출
- 가능
- 이전 badge는 갱신

### 3. 만료 후 공개 상태
- 자동 비노출

### 4. 사용자가 공개 철회
- badge는 유지 가능
- 단 `is_public = false`

### 5. 허위 제출 적발
- badge `revoked`
- 제재 연동 가능
- 운영정책 기준으로 추가 조치

## 이벤트 트래킹
- `sti_intro_viewed`
- `sti_consent_checked`
- `sti_submission_started`
- `sti_submission_completed`
- `sti_submission_approved`
- `sti_submission_rejected`
- `sti_badge_viewed`
- `sti_badge_visibility_toggled`

## 보안 요구사항
- 제출 파일은 public URL 금지
- 운영자 접근 로그 필수
- 최소 권한 원칙 적용
- 서비스 일반 관리자와 STI 검수 운영자 분리
- 원본 삭제 작업 실패 시 알림

## 비기능 요구사항
- 제출 성공/실패 응답 명확
- 검수 처리 후 사용자 알림
- 만료 전 사전 알림
- 모바일 우선 UI

## MVP 출시 조건
- 테이블 3종 구성 완료
- 비공개 스토리지 구성 완료
- 운영자 수동 검수 화면 완료
- 법무 문구 및 동의 화면 완료
- 만료 크론 완료
- 감사 로그 완료

## 출시 보류 조건
- 원본 삭제 자동화 없음
- 공개 동의 분리 없음
- 운영자 접근 통제 없음
- 보증성 카피 제거 미완료

## 후속 확장
- 제휴기관 연동
- 자동 판독 보조
- 신뢰 정보 묶음 확장
- 프로필 신뢰 모듈 고도화

## 구현 우선순위
1. 법무 문구/동의 화면
2. DB 및 스토리지
3. 제출 서버 액션
4. 운영자 검수 액션
5. 프로필 배지 노출
6. 만료 크론
7. 알림 및 감사 로그 보강
