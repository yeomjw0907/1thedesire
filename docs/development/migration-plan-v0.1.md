# 욕망백서 마이그레이션 파일 설계 문서 v0.1

## 1. 목적

- 현재 문서화된 DB 구조를 실제 Supabase 마이그레이션 파일 단위로 분해한다.
- 다음 작업자가 바로 `supabase/migrations`에 옮길 수 있도록 파일 순서와 책임 범위를 고정한다.

## 2. 운영 원칙

- 하나의 마이그레이션은 하나의 책임만 가진다.
- 테이블 생성과 정책 생성은 가능한 분리한다.
- 포인트/환불 로직처럼 데이터 무결성이 중요한 것은 SQL 함수나 서버 액션 기준을 명확히 남긴다.
- MVP에서는 복잡한 DB 트리거보다 `명확한 상태 모델 + 서버 트랜잭션` 조합을 우선한다.

## 3. 권장 파일 구조

```text
supabase/
  migrations/
    202602280001_extensions_and_helpers.sql
    202602280002_create_profiles.sql
    202602280003_create_posts.sql
    202602280004_create_blocks.sql
    202602280005_create_chat_rooms.sql
    202602280006_create_consent_events.sql
    202602280007_create_messages.sql
    202602280008_create_point_transactions.sql
    202602280009_create_payment_events.sql
    202602280010_create_reports.sql
    202602280011_create_moderation_actions.sql
    202602280012_indexes_and_constraints.sql
    202602280013_enable_rls.sql
    202602280014_profiles_policies.sql
    202602280015_posts_policies.sql
    202602280016_chat_and_messages_policies.sql
    202602280017_points_reports_admin_policies.sql
    202602280018_seed_or_bootstrap_notes.sql
```

## 4. 파일별 역할

### 4-1. `202602280001_extensions_and_helpers.sql`

역할:

- `pgcrypto` extension 생성
- `set_updated_at()` 함수 생성

포함 항목:

- `create extension if not exists pgcrypto;`
- `public.set_updated_at()` trigger helper

### 4-2. `202602280002_create_profiles.sql`

역할:

- `profiles` 테이블 생성

포함 항목:

- 기본 프로필 필드
- 포인트 컬럼
- 성인 체크 컬럼
- 계정 상태 컬럼
- `updated_at` trigger

주의:

- `auth.users(id)` 참조 전제
- `nickname unique`

### 4-3. `202602280003_create_posts.sql`

역할:

- `posts` 테이블 생성

포함 항목:

- 자동 생성 글 여부
- 게시글 상태
- `updated_at` trigger

### 4-4. `202602280004_create_blocks.sql`

역할:

- 차단 관계 저장

포함 항목:

- `(blocker_id, blocked_id)` unique
- self-block 금지

### 4-5. `202602280005_create_chat_rooms.sql`

역할:

- DM 요청과 채팅 상태의 중심 테이블 생성

포함 항목:

- `pending/agreed/declined/expired/blocked/closed`
- request cost
- refund amount
- refund policy
- expires at
- `updated_at` trigger

주의:

- self-chat 금지
- 동일 두 유저 간 다중 pending 허용 여부는 추후 정책화 필요

### 4-6. `202602280006_create_consent_events.sql`

역할:

- 요청 생성, 수락, 거절, 만료, 차단 이벤트 기록

포함 항목:

- `event_type`
- `metadata jsonb`

### 4-7. `202602280007_create_messages.sql`

역할:

- 메시지 저장

포함 항목:

- `text/system`
- `active/deleted/flagged`

주의:

- 실제 입력 가능 여부는 RLS 또는 서버 액션에서 `chat_rooms.status = 'agreed'`로 제한

### 4-8. `202602280008_create_point_transactions.sql`

역할:

- 포인트 차감, 환불, 충전, 수동 보정 로그 기록

포함 항목:

- `signup_bonus`
- `charge`
- `debit`
- `refund`
- `manual_adjustment`

주의:

- `balance_after`는 항상 저장
- 모든 거래는 원인 이벤트와 연결

### 4-9. `202602280009_create_payment_events.sql`

역할:

- 입금, 자동 충전, 외부 결제 이벤트 로깅

### 4-10. `202602280010_create_reports.sql`

역할:

- 유저, 게시글, 채팅 신고 저장

### 4-11. `202602280011_create_moderation_actions.sql`

역할:

- 관리자 제재 이력 저장

### 4-12. `202602280012_indexes_and_constraints.sql`

역할:

- 테이블 간 공통 인덱스와 추가 제약 정리

포함 권장:

- `posts(status, created_at desc)`
- `chat_rooms(status, created_at desc)`
- `messages(room_id, created_at asc)`
- `point_transactions(user_id, created_at desc)`
- `reports(status, created_at desc)`

### 4-13. `202602280013_enable_rls.sql`

역할:

- 주요 테이블 RLS 활성화

대상:

- profiles
- posts
- chat_rooms
- messages
- point_transactions
- reports
- blocks

### 4-14. `202602280014_profiles_policies.sql`

역할:

- 프로필 조회/수정 정책

핵심 규칙:

- 본인 프로필 수정 가능
- 일반 조회는 공개 범위 정책 도입 전까지 허용
- banned 계정 노출 여부는 추후 운영 기준 반영

### 4-15. `202602280015_posts_policies.sql`

역할:

- 게시글 조회/작성/수정/삭제 정책

핵심 규칙:

- 본인만 수정/삭제 가능
- 일반 사용자는 `published`만 조회 가능
- `hidden/deleted`는 운영 또는 소유자만 접근

### 4-16. `202602280016_chat_and_messages_policies.sql`

역할:

- 채팅방 및 메시지 접근 정책

핵심 규칙:

- 참여자만 방 조회 가능
- `pending`에서는 메시지 작성 불가
- `agreed`에서만 메시지 작성 가능
- blocked 상태면 조회/작성 제한 범위 검토 필요

### 4-17. `202602280017_points_reports_admin_policies.sql`

역할:

- 포인트 내역, 신고, 운영 이력 접근 정책

핵심 규칙:

- 포인트 거래는 본인만 조회
- 신고는 본인 작성 가능, 운영자 검토 권한 분리
- moderation_actions는 일반 사용자 접근 금지

### 4-18. `202602280018_seed_or_bootstrap_notes.sql`

역할:

- 실제 seed를 넣기보다 운영 메모와 bootstrap 예시 기록

포함 가능:

- 여성 가입 보너스 예시 쿼리
- 자동 소개글 생성 메모
- 만료 배치 처리 메모

## 5. 함수/서버 액션 분리 원칙

### DB에서 처리해도 되는 것

- `updated_at` 갱신
- 기본 제약조건
- 인덱스
- RLS

### 서버 액션 또는 Edge Function에서 처리할 것

- 여성 가입 보너스 270P 지급
- 자동 소개글 생성
- DM 요청 시 포인트 차감 + 채팅방 생성
- 거절 시 45P 환불
- 24시간 만료 시 90P 환불
- 차단 시 환불 없음 처리

이유:

- 포인트와 상태 변경이 복합 이벤트라 DB trigger만으로 관리하면 추후 디버깅이 어려워진다.

## 6. 상태별 구현 체크포인트

### 회원가입 완료

필수 처리:

- `profiles` insert
- 여성 가입 보너스 지급 여부 확인
- `point_transactions` bonus 기록
- 자동 소개글 생성

### DM 요청 생성

필수 처리:

- 차단 관계 확인
- 포인트 잔액 확인
- `chat_rooms pending` 생성
- 발신자 포인트 차감
- 거래 로그 기록
- `consent_events request_created` 기록

### DM 거절

필수 처리:

- room status `declined`
- refund amount `45`
- 환불 포인트 반영
- 거래 로그 기록
- consent event 기록

### DM 만료

필수 처리:

- room status `expired`
- refund amount `90`
- 환불 포인트 반영
- 거래 로그 기록
- consent event 기록

## 7. 다음 작업자용 메모

- `chat_rooms`는 서비스의 상태머신 중심 테이블이다. 여기서 boolean 위주로 단순화하지 말 것.
- 포인트 변경은 반드시 idempotent 하게 구현할 것.
- 환불 중복 실행 방지를 위해 상태 변경 함수나 서버 액션에 보호장치를 둘 것.
- 실제 운영 전에는 테스트 계정으로 `요청 -> 수락 -> 거절 -> 만료 -> 차단` 흐름을 전부 시뮬레이션할 것.

## 8. 최종 판단

지금 단계에서는 거대한 단일 SQL 파일 하나보다, 역할이 분리된 작은 마이그레이션 파일 세트가 훨씬 낫다.

그래야 다음 작업자가 정책 변경, RLS 수정, 상태 로직 보강을 안전하게 이어갈 수 있다.
