# 욕망백서 실행 우선순위 로드맵 v0.1

## 1. 목적

- 지금까지 정리된 문서를 기준으로 실제 실행 순서를 단계별로 정리한다.
- 무엇을 먼저 확정하고, 무엇을 다음 단계로 넘길지 명확히 한다.

## 2. 로드맵 원칙

- 브랜드와 상태 구조가 먼저다
- 운영 리스크를 막는 기능이 우선이다
- 화려한 기능보다 기본 흐름 완성도가 중요하다
- PWA 기준으로 실행한다

## 3. Phase 0: 문서 기준선 확정

목표:

- 이후 판단이 흔들리지 않도록 기준 문서를 고정한다

완료 조건:

- PRD
- 정책
- 상태도 기반 기능명세
- 디자인 시스템
- 브랜드 포지셔닝
- SQL 초안

현재 상태:

- 대부분 완료

## 4. Phase 1: 핵심 사용자 흐름 확정

목표:

- 가입 -> 피드 -> 프로필 -> DM 요청 -> 수락/거절/만료 -> 채팅 흐름 확정

우선 문서:

- `planning/onboarding-signup-spec-v0.1.md`
- `planning/wireframes-v0.1.md`
- `planning/hifi-ui-spec-v0.1.md`
- `planning/state-based-functional-spec-v0.1.md`

핵심 산출물:

- 화면 구조 고정
- 상태 흐름 고정
- 과금/환불 흐름 고정

## 5. Phase 2: 운영 안정성 확정

목표:

- 신고, 차단, 제재, 환불, 정책 노출 기준을 확정

우선 문서:

- `planning/moderation-scenarios-v0.1.md`
- `planning/admin-console-spec-v0.1.md`
- `planning/policy-ui-mapping-v0.1.md`
- `planning/operations-manual-v0.1.md`

핵심 산출물:

- 운영 시나리오 정리
- 운영자 콘솔 요구사항 정리
- 운영 매뉴얼 확보

## 6. Phase 3: 측정 구조 확정

목표:

- 출시 후 제품 상태를 볼 수 있는 측정 기준 확보

우선 문서:

- `planning/operations-kpi-dashboard-v0.1.md`
- `planning/event-tracking-spec-v0.1.md`
- `planning/first-7-days-experience-v0.1.md`

핵심 산출물:

- KPI 기준
- 이벤트 정의
- 리텐션 설계

## 7. Phase 4: 실제 구현 준비

목표:

- 다음 작업자가 바로 구현에 들어갈 수 있게 개발 기준을 묶는다

우선 문서:

- `development/db-schema-v2.md`
- `development/supabase-sql-v0.1.md`
- `development/migration-plan-v0.1.md`
- `planning/mvp-launch-checklist-v0.1.md`

핵심 산출물:

- 마이그레이션 계획
- 상태 기반 DB 구조
- 출시 체크리스트

## 8. Phase 5: 출시 전 마감

목표:

- UI 문구, 정책 노출, FAQ, 콘텐츠 기준을 최종 점검

우선 문서:

- `planning/copy-library-v0.1.md`
- `planning/help-faq-v0.1.md`
- `planning/content-guidelines-v0.1.md`
- `legal/privacy-policy-v0.1.md`

핵심 산출물:

- 사용자-facing 문구 정리
- FAQ 준비
- 정책/개인정보 문서 정리

## 9. 지금 당장 가장 중요한 묶음

1. 상태도 기반 기능명세
2. 포인트/환불 UX
3. 프로필 정보 구조
4. 운영 시나리오
5. SQL / 마이그레이션 계획

## 10. 나중으로 미뤄도 되는 것

- 고급 추천
- 캡처 방지
- 오프라인 만남 안전 기능
- 복잡한 프로필 공개 범위 제어
- 앱 전환 전략 세부화

## 11. 최종 판단

욕망백서 실행 로드맵의 핵심은 `먼저 브랜드를 멋지게 만드는 것`이 아니라  
`먼저 구조를 안정시키고, 그 위에 브랜드를 정확히 얹는 것`이다.

지금까지 정리된 문서 기준으로는 이미 Phase 0과 1 상당 부분이 끝나 있고,  
다음 실질적 병목은 `운영 안정성`과 `구현 준비`다.
