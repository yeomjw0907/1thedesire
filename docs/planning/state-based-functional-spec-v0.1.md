# 욕망백서 상태도 기반 기능명세 v0.1

## 1. 목적

- 욕망백서의 핵심 기능을 상태 변화 기준으로 정리한다.
- 화면, DB, 정책, 백로그가 같은 상태 모델을 바라보도록 만든다.

## 2. 핵심 상태 모델

욕망백서에서 가장 중요한 상태 흐름은 아래 5개다.

1. 회원가입 상태
2. 프로필 완성 상태
3. 게시글 상태
4. DM 요청 상태
5. 계정 제재 상태

## 3. 회원가입 상태

### 상태 목록

- `anonymous`
- `authenticated`
- `profile_pending`
- `profile_completed`
- `onboarding_completed`

### 상태 설명

- `anonymous`: 서비스 미로그인 상태
- `authenticated`: 로그인 완료, 아직 가입 폼 미완료
- `profile_pending`: 필수 입력값 작성 중
- `profile_completed`: 프로필 생성 완료
- `onboarding_completed`: 자동 소개글 생성까지 끝나고 홈 진입 완료

### 전이 규칙

- `anonymous -> authenticated`
  간편 로그인 성공 시

- `authenticated -> profile_pending`
  최초 로그인 후 가입 절차 진입 시

- `profile_pending -> profile_completed`
  닉네임, 성별, 연령대, 지역, 성향, 자기소개, 19세 이상 체크, 약관 동의가 모두 완료되면 전이

- `profile_completed -> onboarding_completed`
  프로필 저장, 여성 270P 지급 조건 처리, 자동 소개글 생성이 끝나면 전이

### 예외

- 닉네임 중복이면 `profile_pending` 유지
- 필수값 누락이면 `profile_pending` 유지
- 약관 미동의면 `profile_pending` 유지

## 4. 프로필 완성 상태

### 상태 목록

- `minimal`
- `standard`
- `rich`

### 상태 설명

- `minimal`: 필수값만 입력
- `standard`: 자기소개와 성향 정보가 충분히 채워짐
- `rich`: 사진, 태그, 게시글 이력 등 탐색 가치가 높은 상태

### 목적

- 프로필은 단순 저장 데이터가 아니라 DM 전환에 영향을 주는 품질 상태로 관리한다.
- 이 상태는 운영자 내부 지표나 추천/정렬 기준으로 활용 가능하다.

## 5. 게시글 상태

### 상태 목록

- `draft`
- `published`
- `hidden`
- `deleted`

### 상태 설명

- `draft`: 작성 중
- `published`: 정상 노출
- `hidden`: 운영 또는 신고 기준으로 숨김
- `deleted`: 작성자 삭제 또는 운영 삭제

### 전이 규칙

- `draft -> published`
  작성자가 게시 완료 시

- `published -> hidden`
  운영자가 신고 검토 후 숨김 처리 시

- `published -> deleted`
  작성자 또는 운영자가 삭제 시

## 6. DM 요청 상태

### 상태 목록

- `pending`
- `agreed`
- `declined`
- `expired`
- `blocked`
- `closed`

### 상태 설명

- `pending`: 요청 생성, 상대 응답 대기
- `agreed`: 상대 수락 완료, 채팅 가능
- `declined`: 상대 거절
- `expired`: 24시간 내 미응답으로 만료
- `blocked`: 차단으로 대화 불가
- `closed`: 운영 종료 또는 유저 탈퇴 등으로 종료

### 상태 전이

- `none -> pending`
  발신자가 90P를 지불하고 DM 요청 생성

- `pending -> agreed`
  수신자가 수락

- `pending -> declined`
  수신자가 거절

- `pending -> expired`
  24시간 미응답

- `pending -> blocked`
  수신자 또는 발신자가 상대를 차단

- `agreed -> blocked`
  대화 중 또는 대화 후 상대 차단

- `agreed -> closed`
  탈퇴, 운영 중단, 방 종료 정책 등

### 상태별 포인트 규칙

- `pending` 진입 시: 발신자 `90P 차감`
- `declined` 진입 시: 발신자 `45P 환불`
- `expired` 진입 시: 발신자 `90P 환불`
- `blocked` 진입 시: 환불 없음
- `agreed` 이후: 메시지 송수신 무료

### 상태별 UI 규칙

- `pending`: 입력창 비활성, 대기 상태 표시
- `agreed`: 입력창 활성
- `declined`: 거절 메시지 및 환불 내역 표시
- `expired`: 만료 메시지 및 전액 환불 표시
- `blocked`: 대화 불가 및 재진입 제한

## 7. 메시지 상태

### 상태 목록

- `active`
- `deleted`
- `flagged`

### 상태 설명

- `active`: 정상 메시지
- `deleted`: 삭제 처리
- `flagged`: 신고 또는 운영 검토 대상

### 비고

- MVP에서는 메시지 편집보다 `정상/삭제/검토` 상태 관리가 우선이다.

## 8. 계정 상태

### 상태 목록

- `active`
- `restricted`
- `suspended`
- `banned`

### 상태 설명

- `active`: 정상 이용 가능
- `restricted`: 일부 기능 제한
- `suspended`: 일시 정지
- `banned`: 영구 정지

### 상태 전이 예시

- `active -> restricted`
  반복 신고 또는 이상 패턴 감지

- `active -> suspended`
  강한 정책 위반

- `restricted -> banned`
  재위반 또는 중대한 위반 확정

## 9. 포인트 거래 상태

### 거래 유형

- `signup_bonus_female`
- `charge`
- `dm_request_cost`
- `dm_decline_refund_half`
- `dm_expire_refund_full`
- `manual_adjustment`

### 규칙

- 모든 포인트 변화는 거래 로그로 남긴다.
- 거래는 언제나 `원인 이벤트`와 연결돼야 한다.
- 사용자 화면에서는 `차감`, `환불`, `보너스`, `충전`으로 읽기 쉽게 보여준다.

## 10. 기능별 상태 의존성

### 가입 기능

- `authenticated` 또는 `profile_pending` 상태에서만 가입 폼 접근 가능

### 홈 피드

- `onboarding_completed` 상태부터 정상 이용 가능

### DM 발신

- `active` 계정만 가능
- 차단 관계가 없어야 함
- 포인트 90 이상이어야 함

### DM 수락

- 수신 계정이 `active`여야 함
- 해당 요청이 `pending`이어야 함

### 메시지 전송

- 채팅방 상태가 `agreed`여야 함
- 양측 계정이 차단 상태가 아니어야 함

## 11. 개발상 중요한 포인트

- Boolean 하나로 처리하지 말고 상태값 기반으로 설계한다.
- 정책과 환불은 상태 진입 시점에 처리한다.
- UI는 현재 상태를 숨기지 않고 노출해야 한다.
- 운영자 도구도 같은 상태 모델을 사용해야 한다.

## 12. 최종 판단

욕망백서의 핵심은 `상태 전이의 명확성`이다.

특히 DM 요청은 단순 채팅이 아니라
`요청 -> 수락/거절/만료/차단 -> 환불/활성화`
흐름을 정확히 가져야 한다.

이 문서를 기준으로 DB, API, UI를 같이 맞추는 것이 좋다.
