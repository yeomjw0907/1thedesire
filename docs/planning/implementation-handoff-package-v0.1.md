# 욕망백서 구현 핸드오프 패키지 v0.1

## 1. 목적

- 다음 작업자가 문서만 보고도 구현에 착수할 수 있게 핵심 자료를 묶는다.
- 문서가 많아도 실제 구현에 필요한 최소 세트를 빠르게 찾도록 만든다.

## 2. 이 패키지의 사용 대상

- 다음 개발 담당자
- Supabase 설정 담당자
- 화면 구현 담당자
- 운영툴 구현 담당자

## 3. 가장 먼저 읽을 문서

### 필수 1차

1. `planning/key-decisions-summary-v0.1.md`
2. `planning/prd-v0.1.md`
3. `planning/state-based-functional-spec-v0.1.md`
4. `planning/feature-reprioritization-v0.1.md`

### 필수 2차

1. `development/db-schema-v2.md`
2. `development/supabase-sql-v0.1.md`
3. `development/migration-plan-v0.1.md`
4. `planning/mvp-launch-checklist-v0.1.md`

## 4. 프론트엔드 구현용 문서 묶음

- `planning/wireframes-v0.1.md`
- `planning/hifi-ui-spec-v0.1.md`
- `planning/wire-copy-v0.1.md`
- `planning/design-system-v1.md`
- `planning/component-system-v0.1.md`
- `planning/copy-library-v0.1.md`

이 묶음의 목적:

- 화면 구조
- UI 톤
- 실제 문구
- 컴포넌트 기준

## 5. 백엔드 / 상태 구현용 문서 묶음

- `planning/state-based-functional-spec-v0.1.md`
- `planning/point-monetization-ux-v0.1.md`
- `development/db-schema-v2.md`
- `development/supabase-sql-v0.1.md`
- `development/migration-plan-v0.1.md`
- `planning/event-tracking-spec-v0.1.md`

이 묶음의 목적:

- 상태 전이
- 포인트 차감/환불
- 테이블 구조
- 이벤트 로그

## 6. 운영툴 구현용 문서 묶음

- `planning/admin-console-spec-v0.1.md`
- `planning/moderation-scenarios-v0.1.md`
- `planning/operations-manual-v0.1.md`
- `planning/policy-ui-mapping-v0.1.md`
- `legal/operation-policy-v0.1.md`

이 묶음의 목적:

- 신고/차단/제재
- 운영자 화면
- 실제 운영 절차

## 7. 브랜드 / 카피 구현용 문서 묶음

- `planning/brand-positioning-v0.2.md`
- `planning/design-system-v1.md`
- `planning/copy-library-v0.1.md`
- `planning/naming-and-copy-expansion-v0.1.md`

이 묶음의 목적:

- 톤앤매너 고정
- 카피 일관성 유지

## 8. 구현 시 절대 바뀌면 안 되는 기준

- 새 DM 요청 `90P`
- 거절 시 `45P 환불`
- 24시간 미응답 시 `90P 전액 환불`
- 차단 시 환불 없음
- 여성 가입 시 `270P`
- 수락 후 대화 무료
- 초기 플랫폼은 `PWA`

## 9. 구현 전에 반드시 확인할 질문

- 이 기능이 상태도 문서와 맞는가
- 이 숫자가 환불 정책 문서와 맞는가
- 이 화면 문구가 카피 라이브러리와 맞는가
- 이 데이터 구조가 SQL 문서와 맞는가
- 이 정책 노출이 UI 매핑 문서와 맞는가

## 10. 구현 우선순위

### 1순위

- 가입
- 자동 소개글
- 홈 피드
- 프로필
- DM 요청 및 상태 전이

### 2순위

- 포인트 내역
- 신고/차단
- 관리자 기본 도구

### 3순위

- 검색/탐색 강화
- 알림/리텐션
- 콘텐츠 가이드 고도화

## 11. 아직 구현 전에 비워둔 것

- RLS 상세 설계
- 결제/입금 운영 예외 상세
- 탈퇴/데이터 삭제 상세

## 12. 다음 작업자에게 주는 메모

- 이 프로젝트는 기능보다 상태와 운영 신뢰가 더 중요하다
- DM을 채팅 기능으로만 구현하면 안 된다
- 프로필은 예쁜 화면이 아니라 판단 도구다
- 숫자 정책은 문서 전체에서 일치해야 한다

## 13. 최종 판단

욕망백서 구현 핸드오프의 핵심은 `문서가 많아도 길을 잃지 않게 하는 것`이다.

이 패키지는 실제 착수 전에 어디부터 읽고, 무엇을 고정 기준으로 삼아야 하는지를 정리한 최소 세트다.
