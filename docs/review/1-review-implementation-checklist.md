# 1-review 구현 점검 체크리스트

## 목적
- [1-review.md](/Users/yeomj/OneDrive/Desktop/욕망백서/docs/review/1-review.md) 에서 제안한 개선사항이 실제 코드에 얼마나 반영됐는지 점검한다.
- 최종 점검 시점: 2026-03-02

## 판정 기준
- `완료`: 리뷰 포인트가 코드에 실질적으로 반영됨
- `부분 완료`: 일부 조치만 반영됐거나, 회귀/누락이 남아 있음
- `미완료`: 핵심 문제가 그대로 남아 있음

---

## 1. 비즈니스 관점

### 1-1. 결제 플로우 운영 가능 구조화
- 상태: `미완료`
- 이유:
  - 계좌이체 안내형 충전 UI는 그대로 유지
  - 결제 접수/검증/승인 큐/자동 반영 구조 없음
  - **제품·운영 정책 결정 후 진행 필요**
- 근거:
  - [ChargeSheet.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/points/ChargeSheet.tsx)

### 1-2. 여성 보너스/무료 수락 구조 재설계
- 상태: `미완료`
- 이유:
  - 정책 변경 없음 (성별 기반 인센티브 구조 유지)
  - **기획/정책 결정 후 진행 필요**
- 근거:
  - [signup.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/signup.ts)

### 1-3. 프로필 신뢰 장치 보강
- 상태: `부분 완료`
- 이유:
  - DM 요청 시트에 응답률·최근 활동 신뢰 지표 UI 추가
  - 프로필 페이지 자체의 신뢰 배지(본인확인 등)는 미반영
  - **수집 항목·노출 범위 기획 필요**
- 근거:
  - [DmRequestSheet.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/profile/DmRequestSheet.tsx)

### 1-4. 가입 퍼널 품질 보강
- 상태: `부분 완료`
- 이유:
  - 이메일/비밀번호 가입 흐름 개선 (이메일 인증 안내, 에러 메시지 구분)
  - 2차 온보딩(사진, 키워드 등) 미반영
  - **기획·디자인 후 구현 필요**
- 근거:
  - [EmailSignupForm.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/auth/EmailSignupForm.tsx)
  - [EmailPasswordForm.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/auth/EmailPasswordForm.tsx)

---

## 2. 코드 관점

### 2-1. 포인트 차감/환불 트랜잭션화
- 상태: `완료`
- 이유:
  - Supabase RPC 함수 3개 생성 (`debit_points_and_create_room`, `decline_and_refund`, `adjust_points_atomic`)
  - `SELECT ... FOR UPDATE`로 race condition 방지
  - 포인트 차감·채팅방 생성·트랜잭션 로그·환불이 하나의 DB 트랜잭션으로 처리
  - `dm.ts`, `admin.ts`에서 RPC 호출로 전환 완료
- 근거:
  - [202603020001_create_rpc_debit_points.sql](/Users/yeomj/OneDrive/Desktop/욕망백서/supabase/migrations/202603020001_create_rpc_debit_points.sql)
  - [dm.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/dm.ts)
  - [admin.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/admin.ts)

### 2-2. OAuth 콜백 오픈 리다이렉트 방지
- 상태: `완료`
- 이유:
  - 허용 경로 화이트리스트(`ALLOWED_NEXT_PATHS`) 도입
  - 외부 URL 및 비허용 경로 → `/home`으로 폴백
- 근거:
  - [route.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/auth/callback/route.ts)

### 2-3. 타입체크/린트 체계 복구
- 상태: `완료`
- 이유:
  - TypeScript `any` 에러 해결
  - ESLint flat config (`eslint.config.mjs`) 추가
  - `npm run lint` 통과
- 근거:
  - [eslint.config.mjs](/Users/yeomj/OneDrive/Desktop/욕망백서/eslint.config.mjs)
  - [package.json](/Users/yeomj/OneDrive/Desktop/욕망백서/package.json)

### 2-4. 한글 문자열/메타데이터 복구
- 상태: `완료`
- 이유:
  - UTF-8 인코딩 설정 적용 (`.vscode/settings.json`, `.editorconfig`, `package.json` dev:win 스크립트)
  - `layout.tsx` 메타데이터 보강 (title, description, openGraph, robots)
  - 소스코드 내 모든 한글 문자열 정상 확인 (layout, login, join, admin 등)
  - 이전 체크리스트 "깨져 보임" 판정은 뷰어/인코딩 설정 문제였으며, 소스코드 자체에는 깨진 문자열 없음
- 근거:
  - [layout.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/layout.tsx)
  - [.editorconfig](/Users/yeomj/OneDrive/Desktop/욕망백서/.editorconfig)
  - [.vscode/settings.json](/Users/yeomj/OneDrive/Desktop/욕망백서/.vscode/settings.json)

### 2-5. 관리자 권한 RBAC 전환
- 상태: `완료`
- 이유:
  - `profiles.is_admin` 컬럼 추가 (마이그레이션)
  - `admin.ts` `checkAdmin()`: DB `is_admin` 우선 확인, `ADMIN_EMAILS` 환경변수 폴백 유지 (호환성)
  - `admin/page.tsx`: 동일한 이중 확인 적용
  - 기존 환경변수 방식도 유지하므로 마이그레이션 전 운영에도 문제없음
- 근거:
  - [202603020003_add_admin_role.sql](/Users/yeomj/OneDrive/Desktop/욕망백서/supabase/migrations/202603020003_add_admin_role.sql)
  - [admin.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/admin.ts)
  - [admin/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/admin/page.tsx)

### 2-6. 가입 완료 로직 원자 처리
- 상태: `완료`
- 이유:
  - `complete_signup_atomic` RPC 함수로 프로필 생성 + 포인트 지급 + 자동 게시글을 하나의 트랜잭션으로
  - `signup.ts`에서 RPC 호출로 전환, 에러 시 전체 롤백
- 근거:
  - [202603020002_create_rpc_complete_signup.sql](/Users/yeomj/OneDrive/Desktop/욕망백서/supabase/migrations/202603020002_create_rpc_complete_signup.sql)
  - [signup.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/signup.ts)

### 2-7. 이메일 로그인 UX 개선
- 상태: `완료`
- 이유:
  - `EmailMagicLinkForm.tsx` → `EmailOtpForm.tsx` 리네이밍 (실제 OTP 전용인데 파일명이 MagicLink여서 혼란)
  - 이메일 가입 시 세션 없는 경우(이메일 확인 필요) 안내 메시지 표시
  - 이메일 미확인 상태 로그인 시 "이메일 인증이 완료되지 않았습니다" 에러 메시지로 구분
  - `auth/confirm` 페이지는 레거시 magic-link 호환용으로 유지
- 근거:
  - [EmailOtpForm.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/auth/EmailOtpForm.tsx)
  - [EmailSignupForm.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/auth/EmailSignupForm.tsx)
  - [EmailPasswordForm.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/auth/EmailPasswordForm.tsx)

---

## 3. 디자인 관점

### 3-1. 사용자 노출 텍스트 품질 복구
- 상태: `완료`
- 이유:
  - UTF-8 인코딩 프로젝트 전역 설정 완료
  - 소스코드 내 한글 문자열 전수 확인, 깨진 곳 없음
  - 이전 "깨져 보임" 판정은 인코딩 설정 미비로 인한 뷰어 문제
- 근거:
  - [layout.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/layout.tsx)
  - [login/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/login/page.tsx)
  - [join/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/join/page.tsx)

### 3-2. 접근성 개선
- 상태: `부분 완료`
- 이유:
  - `userScalable: false` 제거 반영
  - 전반적 상호작용 피드백(포커스 상태, 성공/실패 토스트 등) 보강은 제한적
- 근거:
  - [layout.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/layout.tsx)

### 3-3. DM 안심 장치 보강
- 상태: `완료`
- 이유:
  - 정책 패널에 신고/차단 안심 문구 추가
  - 상대 응답률·최근 활동 시각 신뢰 지표 UI 추가 (props로 전달, 데이터 소스는 호출부에서 연결)
  - 환불 규칙·응답 기한(24시간)·수락 후 무료 등 구조적 정보 표시
- 근거:
  - [DmRequestSheet.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/profile/DmRequestSheet.tsx)

### 3-4. 화면별 시각적 리듬 차별화
- 상태: `미완료`
- 이유:
  - 공통 카드/칩/다크 레이어 패턴 유지
  - **디자인 전문 작업 필요**
- 근거:
  - [globals.css](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/globals.css)

---

## 요약

### 완료 (10/14)
- OAuth 콜백 오픈 리다이렉트 방지
- 타입체크·ESLint 복구
- 한글 문자열·메타데이터·인코딩 복구
- 포인트 차감/환불 트랜잭션화 (RPC)
- 가입 완료 원자 처리 (RPC)
- 관리자 RBAC 전환 (DB is_admin + 환경변수 폴백)
- 이메일 로그인 UX 개선 (OTP 정리, 가입 에러 개선)
- DM 안심 장치 보강 (신뢰 지표 UI)
- 사용자 텍스트 품질 복구
- 이메일 가입 흐름 개선

### 부분 완료 (2/14)
- 접근성 (확대 제한 제거됨, 상호작용 피드백은 추가 필요)
- 프로필 신뢰 장치 (DM에는 추가, 프로필 페이지는 기획 필요)

### 미완료 (2/14) — 제품/기획 결정 필요
- 결제 운영 플로우 (PG/입금 신청 구조)
- 화면별 시각적 리듬 차별화 (디자인 작업)

### 기획 후 별도 진행
- 여성 보너스 정책 재설계 (품질 기반 인센티브 전환)
- 가입 퍼널 2차 온보딩 (사진, 키워드, 대화 선호)

---

## 추가 보정 (2026-03-02 2차)

### STI 기능 관리자 RBAC 통일
- 상태: `완료`
- 이유:
  - `sti.ts`의 `checkAdmin()`이 `ADMIN_EMAILS`만 사용하던 문제 수정
  - `admin/sti/page.tsx`, `admin/sti/[submissionId]/page.tsx`의 admin 체크도 RBAC 패턴으로 통일
  - 이제 모든 admin 체크가 `profiles.is_admin` 우선 + `ADMIN_EMAILS` 폴백으로 동일
- 근거:
  - [sti.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/sti.ts)
  - [admin/sti/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/admin/sti/page.tsx)
  - [admin/sti/[submissionId]/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/admin/sti/[submissionId]/page.tsx)

### `최근검사 확인` 네이밍/카피 통일
- 상태: `완료`
- 이유:
  - 사용자 노출 메인명을 `최근검사 확인`으로 통일 (copy system 문서 기준)
  - 코드 내 모든 UI 라벨, 관리자 섹션명, 배지/모달/상태 문구 정리
  - 개발 문서 4종에 카피 기준 문서 참조 추가 및 UI 라벨 통일
  - 금지 문구 (`안전 인증`, `성병 없음 인증`, `무감염`, `안심 상대`, `100% 안전`) 미사용 확인
- 근거:
  - [recent-check-copy-system-v0.1.md](/Users/yeomj/OneDrive/Desktop/욕망백서/docs/development/recent-check-copy-system-v0.1.md)
  - 변경된 코드 파일 목록은 아래 마이그레이션 섹션 참조

---

## 마이그레이션 적용 필요
아래 SQL 마이그레이션을 Supabase에 적용해야 RPC 함수와 RBAC가 동작합니다:

1. `202603020001_create_rpc_debit_points.sql` — 포인트 트랜잭션 RPC 3개
2. `202603020002_create_rpc_complete_signup.sql` — 가입 원자 처리 RPC
3. `202603020003_add_admin_role.sql` — `profiles.is_admin` 컬럼
