# 욕망백서 에러 상태 및 에러 코드 v0.1

## 1. 목적

- 구현 중 발생할 핵심 실패 케이스를 정리한다.
- 서버 에러코드와 사용자 노출 문구를 분리해서 관리한다.

## 2. 원칙

- 에러코드는 영어 상수로 고정
- 사용자 문구는 짧고 명확하게
- 포인트, 상태, 권한, 차단 관련 에러는 특히 명확해야 한다

## 3. 인증 / 가입

- `UNAUTHORIZED`
  사용자 문구: `로그인이 필요합니다.`

- `NICKNAME_ALREADY_EXISTS`
  사용자 문구: `이미 사용 중인 이름입니다.`

- `INVALID_SIGNUP_INPUT`
  사용자 문구: `입력한 정보를 다시 확인해 주세요.`

- `ADULT_CHECK_REQUIRED`
  사용자 문구: `19세 이상 확인이 필요합니다.`

## 4. DM / 포인트

- `INSUFFICIENT_POINTS`
  사용자 문구: `포인트가 부족합니다.`

- `BLOCKED_RELATIONSHIP`
  사용자 문구: `이 사용자와는 더 이상 요청을 보낼 수 없습니다.`

- `INVALID_ROOM_STATE`
  사용자 문구: `현재 상태에서는 이 작업을 진행할 수 없습니다.`

- `ROOM_ALREADY_PROCESSED`
  사용자 문구: `이미 처리된 요청입니다.`

- `REQUEST_EXPIRED`
  사용자 문구: `이미 만료된 요청입니다.`

- `REFUND_ALREADY_APPLIED`
  사용자 문구: `이미 환불이 반영된 요청입니다.`

## 5. 메시지

- `MESSAGE_NOT_ALLOWED`
  사용자 문구: `지금은 메시지를 보낼 수 없습니다.`

- `ROOM_NOT_AGREED`
  사용자 문구: `수락 후 대화를 시작할 수 있습니다.`

## 6. 신고 / 차단

- `REPORT_INVALID_TARGET`
  사용자 문구: `신고 대상을 다시 확인해 주세요.`

- `SELF_BLOCK_NOT_ALLOWED`
  사용자 문구: `본인을 차단할 수 없습니다.`

## 7. 결제 / 충전

- `PAYMENT_NOT_CONFIRMED`
  사용자 문구: `결제 상태를 확인 중입니다.`

- `PAYMENT_DUPLICATED`
  사용자 문구: `이미 처리된 결제입니다.`

- `POINT_ADJUSTMENT_REQUIRED`
  사용자 문구: `운영 확인이 필요한 상태입니다.`

## 8. 운영자 전용

- `FORBIDDEN`
  사용자 문구: `접근 권한이 없습니다.`

- `ADMIN_ROLE_REQUIRED`
  사용자 문구: `운영자 권한이 필요합니다.`

## 9. 최종 판단

에러코드는 사용자에게 공포를 주는 장치가 아니라, 상태를 명확히 설명하는 장치여야 한다.
