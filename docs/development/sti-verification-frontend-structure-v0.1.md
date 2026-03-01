# STI Verification Frontend Structure v0.1

> **카피 기준**: 사용자 노출 문구는 [recent-check-copy-system-v0.1.md](recent-check-copy-system-v0.1.md)를 따른다.
> 사용자 노출 메인명은 `최근검사 확인`이다.

## 목적
- `최근검사 확인` 기능을 실제 프론트엔드 구현 단위로 분해한다.
- 기준은 현재 App Router 구조와 기존 `src/app`, `src/components`, `src/lib/actions` 패턴을 따른다.

## 구현 원칙
- 페이지는 서버 컴포넌트 우선
- 입력/모달/토글은 클라이언트 컴포넌트
- 상태 조회는 서버에서 가져오고, 제출/토글/철회는 server action 사용
- `검증 상태`와 `공개 여부`는 UI에서도 분리 표현

## 라우트 구조 제안

### 사용자 라우트
```text
src/app/(main)/profile/verification/page.tsx
src/app/(main)/profile/verification/submit/page.tsx
src/app/(main)/profile/verification/status/page.tsx
```

### 관리자 라우트
```text
src/app/admin/sti/page.tsx
src/app/admin/sti/[submissionId]/page.tsx
```

## 페이지별 역할

### 1. `src/app/(main)/profile/verification/page.tsx`
### 역할
- 기능 소개
- 현재 배지 상태 요약
- 공개 상태 요약
- 진입 CTA

### 서버에서 로드할 데이터
- 현재 user
- `sti_check_badges`
- 최근 submission 1건

### 렌더링 분기
- `none`: 기능 소개 + 시작 버튼
- `pending`/`under_review`: 상태 카드 + 상세 보기 버튼
- `verified`: 배지 상태 카드 + 공개 토글 + 철회 버튼
- `rejected`: 반려 사유 카드 + 재제출 버튼
- `expired`: 만료 카드 + 재검증 버튼
- `revoked`: 철회 상태 카드 + 재신청 버튼

## 2. `src/app/(main)/profile/verification/submit/page.tsx`
### 역할
- 동의 + 제출 폼

### 서버에서 로드할 데이터
- user
- 현재 badge 상태

### 보호 조건
- `pending`, `under_review` 상태면 제출 화면 진입 차단 또는 읽기 전용 처리

### 포함 컴포넌트
- `StiVerificationIntroCard`
- `StiVerificationConsentForm`
- `StiVerificationUploadForm`

## 3. `src/app/(main)/profile/verification/status/page.tsx`
### 역할
- 상세 상태 조회
- 반려 사유
- 검사일/유효기간
- 공개 설정 변경

### 서버에서 로드할 데이터
- badge
- 최근 submission
- audit summary optional

## 4. `src/app/admin/sti/page.tsx`
### 역할
- 제출 대기 목록
- 필터
- SLA 확인
- 만료 예정 목록 링크

### 서버에서 로드할 데이터
- pending/under_review submissions
- expired soon badges
- summary counts

## 5. `src/app/admin/sti/[submissionId]/page.tsx`
### 역할
- 제출 상세 검수
- 승인/반려 처리

### 서버에서 로드할 데이터
- submission detail
- badge detail
- reviewer-safe metadata

## 컴포넌트 구조 제안

### 사용자 컴포넌트
```text
src/components/sti/StiVerificationStatusCard.tsx
src/components/sti/StiVerificationIntroCard.tsx
src/components/sti/StiVerificationConsentForm.tsx
src/components/sti/StiVerificationUploadForm.tsx
src/components/sti/StiVerificationPublicToggle.tsx
src/components/sti/StiVerificationBadge.tsx
src/components/sti/StiVerificationBadgeModal.tsx
src/components/sti/StiVerificationRejectedCard.tsx
src/components/sti/StiVerificationExpiredCard.tsx
src/components/sti/StiVerificationRevokeSheet.tsx
```

### 관리자 컴포넌트
```text
src/components/admin/sti/AdminStiSubmissionTable.tsx
src/components/admin/sti/AdminStiSubmissionCard.tsx
src/components/admin/sti/AdminStiReviewPanel.tsx
src/components/admin/sti/AdminStiApproveForm.tsx
src/components/admin/sti/AdminStiRejectForm.tsx
src/components/admin/sti/AdminStiAuditLogList.tsx
```

## 컴포넌트별 책임

### `StiVerificationStatusCard`
- 현재 상태 라벨
- 검사일
- 유효기간
- 공개 상태
- 상태별 CTA

### `StiVerificationConsentForm`
- 민감정보 동의
- 검수 처리 동의
- 공개 동의
- 제출 전 검증

### `StiVerificationUploadForm`
- 검사일 입력
- 파일 업로드
- 제출 버튼
- 에러 상태

### `StiVerificationPublicToggle`
- `verified` 상태일 때만 노출
- `is_public` on/off
- 토글 사유 설명

### `StiVerificationBadge`
- 프로필/리스트에 노출되는 배지 UI
- 노출 정보 최소화

### `StiVerificationBadgeModal`
- 클릭 시 고지 문구
- `현재 상태 보증 아님` 안내

### `StiVerificationRevokeSheet`
- 공개 철회 또는 검증 철회 확인

### `AdminStiReviewPanel`
- 제출 정보
- 체크리스트
- 제출물 뷰어
- 승인/반려 CTA

## Server Action 구조 제안
```text
src/lib/actions/sti.ts
```

### 포함 액션
- `createStiVerificationSubmission`
- `setStiBadgeVisibility`
- `revokeStiVerification`
- `approveStiVerificationSubmission`
- `rejectStiVerificationSubmission`

## 타입 구조 제안
```text
src/types/sti.ts
```

### 포함 타입
- `StiBadgeStatus`
- `StiVerificationBadge`
- `StiVerificationSubmission`
- `StiVerificationAuditLog`
- `CreateStiSubmissionInput`
- `ApproveStiSubmissionInput`

## 상태별 UI 분기 규칙

### `none`
- 소개 카드
- 시작 CTA

### `pending`
- 제출 완료 카드
- `검수 대기 중`
- 재제출 숨김

### `under_review`
- `검토 중`
- 재제출 숨김

### `verified`
- 검사일/만료일 표시
- 공개 토글 표시
- 철회 버튼 표시

### `rejected`
- 반려 사유 표시
- 재제출 CTA

### `expired`
- 만료 안내
- 재검증 CTA

### `revoked`
- 철회 완료 안내
- 재신청 CTA

## 프로필 화면 연동 포인트

### 파일
- `src/app/(main)/profile/[id]/page.tsx`
- `src/app/(main)/profile/page.tsx`

### 해야 할 일
- 공개 badge 조건 충족 시 배지 모듈 삽입
- 클릭 시 상세 모달 열기
- 배지를 신뢰 정보 섹션 내부에 배치

## 관리자 화면 연동 포인트

### 파일
- `src/app/admin/page.tsx`

### 해야 할 일
- 기존 admin 진입점에 STI 섹션 링크 추가
- STI 요약 위젯 추가

## 추천 파일 생성 순서
1. `src/types/sti.ts`
2. `src/lib/actions/sti.ts`
3. 사용자 상태 페이지
4. 제출 폼 컴포넌트
5. 관리자 리스트 페이지
6. 관리자 상세 검수 페이지
7. 프로필 배지 컴포넌트 연동

## 테스트 포인트
- 미인증 유저 진입
- 중복 제출 차단
- 승인 후 공개 on/off
- 만료 후 자동 숨김
- 반려 후 재제출
- 철회 후 비노출

## 최종 권장 구조
- 사용자 기능은 `profile/verification` 하위로 묶는다.
- 관리자 기능은 `admin/sti` 하위로 분리한다.
- 액션은 `src/lib/actions/sti.ts` 한 파일에서 시작하고, 커지면 `user/admin` 로 나눈다.
