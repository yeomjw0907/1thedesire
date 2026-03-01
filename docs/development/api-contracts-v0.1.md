# 욕망백서 API / 서버 액션 계약 v0.1

## 1. 목적

- 프론트엔드와 백엔드가 같은 입력/출력 규격을 보도록 한다.
- 상태 전이와 포인트 반영이 얽힌 핵심 액션의 계약을 문서화한다.

## 2. 기본 원칙

- 상태 변화가 일어나는 기능은 서버 액션 또는 보호된 API에서만 처리한다
- 응답에는 항상 `success`, `data`, `error` 구조를 유지한다
- 포인트 변화가 있는 액션은 결과에 `point_delta`와 `balance_after`를 포함하는 것이 좋다

## 3. 공통 응답 형식

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

실패 시:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INSUFFICIENT_POINTS",
    "message": "포인트가 부족합니다."
  }
}
```

## 4. 가입 완료 처리

### 액션명

- `completeSignup`

### 입력

```json
{
  "nickname": "string",
  "gender": "male|female|other",
  "age_group": "string",
  "region": "string",
  "role": "string",
  "bio": "string",
  "is_adult_checked": true
}
```

### 처리

- profiles 생성
- 여성일 경우 270P 지급
- 자동 소개글 생성

### 출력

```json
{
  "success": true,
  "data": {
    "profile_id": "uuid",
    "points": 270,
    "auto_post_id": "uuid"
  },
  "error": null
}
```

## 5. DM 요청 생성

### 액션명

- `sendDmRequest`

### 입력

```json
{
  "target_user_id": "uuid"
}
```

### 처리

- 차단 관계 확인
- 포인트 90 이상 확인
- chat_room pending 생성
- 90P 차감
- consent event 생성

### 출력

```json
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "status": "pending",
    "point_delta": -90,
    "balance_after": 180,
    "request_expires_at": "timestamp"
  },
  "error": null
}
```

## 6. DM 수락

### 액션명

- `acceptDmRequest`

### 입력

```json
{
  "room_id": "uuid"
}
```

### 출력

```json
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "status": "agreed",
    "agreed_at": "timestamp"
  },
  "error": null
}
```

## 7. DM 거절

### 액션명

- `declineDmRequest`

### 입력

```json
{
  "room_id": "uuid"
}
```

### 출력

```json
{
  "success": true,
  "data": {
    "room_id": "uuid",
    "status": "declined",
    "point_delta": 45,
    "balance_after": 135,
    "refund_amount": 45
  },
  "error": null
}
```

## 8. DM 차단

### 액션명

- `blockUser`

### 입력

```json
{
  "target_user_id": "uuid",
  "room_id": "uuid | null"
}
```

### 출력

```json
{
  "success": true,
  "data": {
    "blocked": true,
    "room_status": "blocked"
  },
  "error": null
}
```

## 9. 메시지 전송

### 액션명

- `sendMessage`

### 입력

```json
{
  "room_id": "uuid",
  "content": "string"
}
```

### 처리 조건

- room status = agreed
- 차단 관계 없음

## 10. 신고 생성

### 액션명

- `submitReport`

### 입력

```json
{
  "target_type": "profile|post|chat",
  "target_id": "uuid",
  "reason": "string",
  "description": "string"
}
```

## 11. 포인트 충전 완료 반영

### 액션명

- `completePointCharge`

### 입력

```json
{
  "user_id": "uuid",
  "amount": 1000,
  "provider": "string",
  "payment_event_id": "uuid"
}
```

## 12. 최종 판단

이 문서는 실제 구현 전 API shape를 고정하기 위한 최소 계약이다.

숫자 정책과 상태 전이가 바뀌면 이 문서를 먼저 같이 갱신해야 한다.
