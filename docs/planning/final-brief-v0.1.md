# 욕망백서 최종 정리 / 압축본 v0.1

## 1. 서비스 정의

욕망백서는 피드 기반 취향 탐색과 합의 기반 DM을 결합한 한국형 익명 취향 소셜이다.

핵심 문장:

- 분위기를 먼저 보고, 대화는 그 다음에

## 2. 핵심 정책

- 초기 플랫폼: PWA / 모바일 웹
- 새 DM 요청: 90P 차감
- 거절: 45P 환불
- 24시간 미응답 만료: 90P 전액 환불
- 차단: 환불 없음
- 여성 가입: 270P 지급
- 수락 후 대화: 무료

## 3. 핵심 구조

1. 가입
2. 자동 소개글 생성
3. 홈 피드 탐색
4. 프로필 판단
5. DM 요청
6. 수락 / 거절 / 만료 / 차단
7. 수락 후 대화

## 4. 핵심 UX 원칙

- 자극보다 신뢰
- 익명성보다 통제감
- 홈은 탐색
- 프로필은 판단
- DM은 결제가 아니라 요청 절차

## 5. 핵심 브랜드 원칙

- 저가형 성인앱처럼 보이면 안 된다
- 세련되고 절제된 톤 유지
- 사진보다 분위기와 텍스트 우선
- 20대 후반~30대 후반에게 신뢰감 있는 디자인

## 6. 핵심 운영 원칙

- 신고 / 차단은 빠르고 쉬워야 한다
- 미성년 의심, 협박, 금전 요구, 불법 콘텐츠는 최우선 대응
- 운영 판단은 일관되고 로그가 남아야 한다

## 7. 핵심 데이터 원칙

- 상태값 중심 설계
- 포인트 증감은 거래 로그 기반
- RLS는 접근 제어 중심
- 비즈니스 로직은 서버 액션 중심

## 8. 지금 당장 중요한 문서

### 기획

- `planning/key-decisions-summary-v0.1.md`
- `planning/state-based-functional-spec-v0.1.md`
- `planning/feature-reprioritization-v0.1.md`

### UX / 디자인

- `planning/wireframes-v0.1.md`
- `planning/hifi-ui-spec-v0.1.md`
- `planning/design-system-v1.md`

### 운영

- `planning/moderation-scenarios-v0.1.md`
- `planning/operations-manual-v0.1.md`

### 개발

- `development/supabase-sql-v0.1.md`
- `development/migration-plan-v0.1.md`
- `development/rls-policy-spec-v0.1.md`

## 9. 아직 남은 중요 빈칸

- RLS 실제 SQL
- 결제/입금 운영 세부 고도화
- 탈퇴 / 데이터 삭제 상세화

## 10. 최종 판단

욕망백서는 기능 수보다 `탐색 -> 판단 -> 요청 -> 명확한 상태 변화` 흐름이 중요한 서비스다.

이 흐름만 흔들리지 않으면, 디자인, 정책, 구현은 모두 같은 방향으로 정렬될 수 있다.
