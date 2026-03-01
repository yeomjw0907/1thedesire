# 욕망백서 DB 설계 v2

## 1. 설계 방향

- MVP 기준으로 최소 운영이 가능한 상태 모델을 우선 설계한다.
- 단순 Boolean 대신 상태값 중심으로 채팅과 결제 흐름을 관리한다.
- 포인트, 합의, 신고, 운영 로그는 별도 테이블로 분리한다.

## 2. 테이블 설계

### 2-1. profiles

목적: 유저 기본 정보 및 상태 관리

권장 컬럼:

- `id UUID PRIMARY KEY`
- `nickname TEXT UNIQUE NOT NULL`
- `gender TEXT`
- `age_group TEXT`
- `region TEXT`
- `role TEXT`
- `bio TEXT NOT NULL`
- `points INTEGER DEFAULT 0`
- `gender_benefit_type TEXT`
- `is_adult_checked BOOLEAN DEFAULT FALSE`
- `adult_checked_at TIMESTAMPTZ`
- `account_status TEXT DEFAULT 'active'`
- `reported_count INTEGER DEFAULT 0`
- `blocked_count INTEGER DEFAULT 0`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

`account_status` 예시:

- `active`
- `suspended`
- `banned`

`gender_benefit_type` 예시:

- `standard`
- `female_starter`

### 2-2. posts

목적: 피드 게시글 저장

권장 컬럼:

- `id UUID PRIMARY KEY`
- `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE`
- `content TEXT NOT NULL`
- `image_url TEXT`
- `is_auto_generated BOOLEAN DEFAULT FALSE`
- `status TEXT DEFAULT 'published'`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

`status` 예시:

- `published`
- `hidden`
- `deleted`

### 2-3. chat_rooms

목적: DM 요청과 채팅 상태 관리

권장 컬럼:

- `id UUID PRIMARY KEY`
- `initiator_id UUID REFERENCES profiles(id)`
- `receiver_id UUID REFERENCES profiles(id)`
- `status TEXT DEFAULT 'pending'`
- `request_cost INTEGER DEFAULT 90`
- `refund_amount INTEGER DEFAULT 0`
- `refund_policy TEXT`
- `agreed_at TIMESTAMPTZ`
- `declined_at TIMESTAMPTZ`
- `expired_at TIMESTAMPTZ`
- `request_expires_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`

`status` 예시:

- `pending`
- `agreed`
- `declined`
- `expired`
- `blocked`
- `closed`

`refund_policy` 예시:

- `decline_half_refund`
- `expire_full_refund`
- `blocked_no_refund`

### 2-4. messages

목적: 채팅 메시지 저장

권장 컬럼:

- `id UUID PRIMARY KEY`
- `room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE`
- `sender_id UUID REFERENCES profiles(id)`
- `content TEXT NOT NULL`
- `message_type TEXT DEFAULT 'text'`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `deleted_at TIMESTAMPTZ`

`message_type` 예시:

- `text`
- `system`

### 2-5. consent_events

목적: 합의 흐름 기록

권장 컬럼:

- `id UUID PRIMARY KEY`
- `room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE`
- `actor_id UUID REFERENCES profiles(id)`
- `event_type TEXT NOT NULL`
- `metadata JSONB`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

`event_type` 예시:

- `request_created`
- `request_viewed`
- `agreement_accepted`
- `agreement_declined`
- `request_expired`

### 2-6. point_transactions

목적: 포인트 차감, 충전, 환불 기록

권장 컬럼:

- `id UUID PRIMARY KEY`
- `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE`
- `type TEXT NOT NULL`
- `amount INTEGER NOT NULL`
- `balance_after INTEGER NOT NULL`
- `reference_type TEXT`
- `reference_id UUID`
- `description TEXT`
- `policy_code TEXT`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

`type` 예시:

- `charge`
- `debit`
- `refund`

`policy_code` 예시:

- `signup_bonus_female`
- `dm_request_cost`
- `dm_decline_refund_half`
- `dm_expire_refund_full`

### 2-7. payment_events

목적: 입금 및 결제 처리 로그

권장 컬럼:

- `id UUID PRIMARY KEY`
- `user_id UUID REFERENCES profiles(id)`
- `provider TEXT`
- `status TEXT`
- `amount INTEGER`
- `raw_payload JSONB`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

### 2-8. reports

목적: 신고 접수 관리

권장 컬럼:

- `id UUID PRIMARY KEY`
- `reporter_id UUID REFERENCES profiles(id)`
- `target_user_id UUID REFERENCES profiles(id)`
- `target_post_id UUID REFERENCES posts(id)`
- `target_room_id UUID REFERENCES chat_rooms(id)`
- `reason TEXT NOT NULL`
- `description TEXT`
- `status TEXT DEFAULT 'open'`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `resolved_at TIMESTAMPTZ`

`status` 예시:

- `open`
- `reviewing`
- `resolved`
- `dismissed`

### 2-9. blocks

목적: 유저 차단 관계 저장

권장 컬럼:

- `id UUID PRIMARY KEY`
- `blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE`
- `blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

권장 제약:

- `(blocker_id, blocked_id)` unique

### 2-10. moderation_actions

목적: 운영자 제재 기록

권장 컬럼:

- `id UUID PRIMARY KEY`
- `target_user_id UUID REFERENCES profiles(id)`
- `action_type TEXT NOT NULL`
- `reason TEXT`
- `metadata JSONB`
- `created_at TIMESTAMPTZ DEFAULT NOW()`

`action_type` 예시:

- `warn`
- `suspend`
- `ban`
- `hide_post`

## 3. 추가 결정 필요 항목

1. 미응답 만료 시 환불 정책
2. 차단 시 환불 정책
3. 메시지 보관 기간
4. 탈퇴 시 로그 보존 범위
5. 신고 누적 정지 기준
