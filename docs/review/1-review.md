# 리뷰 1

## 범위
- 대상: 인증, 가입, 홈 피드, 프로필, DM, 포인트, 관리자, 전역 UI
- 기준: 실제 코드 기준 운영 리스크, 코드 품질, 디자인 완성도
- 검증: `npx tsc --noEmit` 실행 결과 타입 에러 2건 확인, ESLint는 설정 부재로 실행 불가

## 1. 비즈니스적 관점에서 개선사항

### 1. 결제 플로우가 실제 매출 전환보다 운영 수작업 부담을 키우는 구조
- 근거: [src/components/points/ChargeSheet.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/points/ChargeSheet.tsx#L12) 에 계좌이체 안내만 있고 결제 완료 검증, 입금자 확인, 자동 적립 흐름이 없습니다.
- 영향: 충전 의도는 있어도 이탈률이 높고, CS/수기 정산 비용이 계속 누적됩니다.
- 개선: MVP라도 결제 상태 접수, 입금자명 입력, 관리자 승인 큐, 처리 예상 시간, 실패 시 문의 경로를 데이터로 남겨야 합니다. 다음 단계에서는 PG 또는 최소한 입금 신청 테이블이 필요합니다.

### 2. 여성 보너스와 무료 수락 혜택은 초기 유입에는 도움 되지만 장기적으로 왜곡 가능성이 큼
- 근거: [src/lib/actions/signup.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/signup.ts#L103) 에서 여성 가입 시 270P 지급, [src/app/(main)/profile/[id]/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/(main)/profile/[id]/page.tsx#L109) 에서 여성에게 무료 수락 혜택을 노출합니다.
- 영향: 특정 성별 인센티브에 서비스 가치가 과도하게 묶이면 허수 가입, 멀티 계정, 불균형 매칭 경험이 커질 수 있습니다.
- 개선: 보너스 기준을 성별 단일 조건이 아니라 프로필 완성도, 본인확인, 첫 주 활동, 신고율 등을 포함한 품질 기반 인센티브로 전환하는 게 안전합니다.

### 3. 신고/제재는 있으나 신뢰 형성 장치가 약함
- 근거: 관리자 기능은 있지만 [src/app/admin/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/admin/page.tsx) 수준의 내부 운영 화면에 머물고, 사용자에게는 프로필 신뢰 지표가 거의 없습니다.
- 영향: DM 과금형 서비스에서 유저는 상대 신뢰도를 못 보면 결제를 주저합니다.
- 개선: 프로필에 본인확인 여부, 최근 활동 신뢰도, 신고 처리 이력 요약, 응답률 같은 비식별 신뢰 지표를 추가하는 편이 전환에 유리합니다.

### 4. 가입 퍼널이 최소 입력 위주라 품질보다는 속도에 치우쳐 있음
- 근거: [src/components/signup/SignupForm.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/signup/SignupForm.tsx#L33) 는 닉네임, 성별, 연령대, 지역, 역할, 소개 정도만 받습니다.
- 영향: 가입률은 오를 수 있지만 피드 품질과 DM 전환 품질이 낮아질 수 있습니다.
- 개선: 필수 입력은 유지하되, 가입 직후 단계형으로 사진, 관심 키워드, 대화 선호, 경계선/금지사항 같은 품질 필드를 유도하는 2차 온보딩이 필요합니다.

## 2. 코드단 관점에서 개선사항

### 1. 포인트 차감/환불 로직이 트랜잭션으로 묶여 있지 않아 잔액 불일치가 발생할 수 있음
- 근거: [src/lib/actions/dm.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/dm.ts#L77) 에서 포인트 차감 후 채팅방을 생성하고, 실패 시 수동 복구합니다. [src/lib/actions/dm.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/dm.ts#L241) 와 [src/lib/actions/admin.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/admin.ts#L94) 도 잔액 조회 후 update/insert 를 분리 실행합니다.
- 위험: 동시 요청이나 중간 실패 시 포인트 잔액과 `point_transactions` 내역이 어긋날 수 있습니다.
- 개선: Supabase RPC 또는 SQL 함수로 차감, 방 생성, 트랜잭션 로그 기록을 한 트랜잭션으로 묶어야 합니다.

### 2. OAuth 콜백의 `next` 파라미터가 검증 없이 리다이렉트에 사용됨
- 근거: [src/app/auth/callback/route.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/auth/callback/route.ts#L17) 과 [src/app/auth/callback/route.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/auth/callback/route.ts#L44)
- 위험: 외부 URL 또는 비정상 경로 주입 가능성이 있으면 오픈 리다이렉트 취약점으로 이어질 수 있습니다.
- 개선: `next` 는 `/` 로 시작하는 내부 경로만 허용하고, 허용 목록 기반으로 제한해야 합니다.

### 3. 타입 체크가 현재 깨져 있고 린트 체계도 비활성 상태
- 근거: `npx tsc --noEmit` 결과 [src/app/(main)/profile/[id]/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/(main)/profile/[id]/page.tsx#L137), [src/app/(main)/profile/[id]/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/(main)/profile/[id]/page.tsx#L151) 에 암시적 `any` 에러가 발생했습니다. `npx eslint src --ext .ts,.tsx` 는 ESLint 9용 `eslint.config.*` 부재로 실행되지 않았습니다.
- 위험: 리팩터링 시 회귀를 조기에 막아줄 안전망이 없습니다.
- 개선: ESLint flat config 를 도입하고 CI 에 `tsc --noEmit`, lint, 최소 smoke test 를 붙여야 합니다.

### 4. 한글 문자열과 메타데이터가 다수 깨져 있어 실제 사용자 노출 품질과 SEO에 직접 손상
- 근거: [src/app/layout.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/layout.tsx#L4), [src/app/login/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/login/page.tsx#L50), [src/lib/actions/signup.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/signup.ts#L13)
- 위험: 브라우저 탭 제목, 설명, 버튼 라벨, 에러 메시지 등이 깨지면 신뢰도와 검색 노출 품질이 바로 떨어집니다.
- 개선: 저장소 인코딩을 UTF-8 로 통일하고, 깨진 문자열을 우선 복구한 뒤 i18n 또는 상수 분리로 재발을 막아야 합니다.

### 5. 관리자 권한을 이메일 문자열 비교에 의존
- 근거: [src/lib/actions/admin.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/admin.ts#L13), [src/app/admin/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/admin/page.tsx#L24)
- 위험: 운영자 관리가 배포 환경 변수에 묶여 확장성, 감사성, 역할 회수 관리가 약합니다.
- 개선: `profiles` 또는 별도 admin role 테이블 기반 RBAC 로 전환하고, 모든 운영 액션에 사유/대상/실행자 로그를 강제해야 합니다.

### 6. 가입 완료 로직도 부분 성공 상태를 만들 수 있음
- 근거: [src/lib/actions/signup.ts](/Users/yeomj/OneDrive/Desktop/욕망백서/src/lib/actions/signup.ts#L107) 이후 프로필 생성, 포인트 로그, 자동 게시글 생성이 분리되어 있고 실패 시 일부만 기록될 수 있습니다.
- 위험: 프로필은 생겼지만 포인트 로그가 없거나 첫 게시글이 없는 비정상 가입 상태가 남습니다.
- 개선: 가입 완료 역시 DB 함수로 원자 처리하거나, 최소한 보상 트랜잭션과 재처리 큐를 둬야 합니다.

## 3. 디자인적 관점에서 개선사항

### 1. 핵심 화면 전반에 텍스트 깨짐이 있어 브랜드 신뢰를 바로 훼손
- 근거: [src/app/login/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/login/page.tsx#L50), [src/app/(main)/home/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/(main)/home/page.tsx), [src/app/(main)/profile/[id]/page.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/(main)/profile/[id]/page.tsx#L78)
- 영향: 성인 관계/신뢰 기반 서비스에서 텍스트 깨짐은 사기성 서비스처럼 보이게 만듭니다.
- 개선: 모든 사용자 노출 문자열을 우선 복구하고, 릴리즈 전에 한글 스냅샷 점검을 해야 합니다.

### 2. 모바일 톤앤매너는 잡혀 있지만 정보 계층이 단조롭고 차별점이 약함
- 근거: 카드, 칩, 다크 배경 중심 패턴이 대부분 화면에서 반복됩니다. [src/app/globals.css](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/globals.css#L25) 의 공통 컴포넌트도 거의 동일한 표면 스타일에 집중돼 있습니다.
- 영향: 전체 서비스가 “같은 카드의 반복”처럼 보여 탐색 피로가 생기고, 관계 서비스 특유의 분위기 구분이 약합니다.
- 개선: 홈, 프로필, DM, 포인트 각 화면에 다른 시각적 리듬을 주고, 정보 밀도와 강조 방식도 화면 목적에 맞게 달리해야 합니다.

### 3. DM 과금 정책은 노출되지만 심리적 안심 장치가 부족함
- 근거: [src/components/profile/DmRequestSheet.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/components/profile/DmRequestSheet.tsx) 에 비용 안내는 있지만, 상대 응답 기대치나 안전장치 설명은 약합니다.
- 영향: “돈을 쓰고 먼저 요청한다”는 긴장을 줄여주지 못해 전환이 떨어질 수 있습니다.
- 개선: 환불 규칙 외에 신고/차단 가능, 응답 기한, 상대 프로필 품질, 최근 활동 정보 등을 더 구조적으로 보여줘야 합니다.

### 4. 접근성과 상호작용 피드백 보강이 필요
- 근거: [src/app/layout.tsx](/Users/yeomj/OneDrive/Desktop/욕망백서/src/app/layout.tsx#L15) 에서 `userScalable: false` 로 확대가 막혀 있고, 여러 버튼/시트가 색 변화 위주 피드백에 의존합니다.
- 영향: 저시력 사용자 접근성이 떨어지고, 모달/시트 상호작용도 확신이 약합니다.
- 개선: 확대 제한을 제거하고, 포커스 상태, 성공/실패 토스트, 로딩 상태, 비활성 사유 텍스트를 더 명시적으로 보여줘야 합니다.

## 우선순위 제안
1. 문자열 인코딩 복구와 메타데이터 정리
2. DM/포인트/가입 완료 로직의 DB 트랜잭션화
3. ESLint flat config + 타입체크 + CI 품질 게이트 구축
4. 관리자 권한을 RBAC 구조로 전환
5. 결제 신청/승인 플로우를 실제 운영 가능한 구조로 재설계
