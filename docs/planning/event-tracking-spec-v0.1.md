# 욕망백서 이벤트 트래킹 설계 v0.1

## 1. 목적

- KPI 문서를 실제 측정 가능한 이벤트 단위로 연결한다.
- 출시 이후 어떤 행동을 어떤 이름으로 기록할지 기준을 정한다.

## 2. 기본 원칙

- 이벤트 이름은 짧고 일관되게
- 한 이벤트는 한 행동만 의미해야 함
- 상태 변화는 반드시 이벤트로 남긴다
- 과도한 추적보다 제품 판단에 필요한 이벤트를 우선한다

## 3. 이벤트 분류

### 3-1. 유입 / 가입

- `landing_viewed`
- `login_started`
- `login_completed`
- `signup_started`
- `signup_completed`
- `adult_check_completed`
- `auto_intro_post_created`

### 3-2. 홈 / 탐색

- `home_viewed`
- `feed_scrolled`
- `post_viewed`
- `profile_viewed`
- `search_viewed`
- `search_used`
- `filter_applied`

### 3-3. 프로필

- `profile_edit_started`
- `profile_edit_completed`
- `profile_completion_updated`
- `profile_report_clicked`
- `profile_block_clicked`

### 3-4. DM / 채팅

- `dm_request_sheet_viewed`
- `dm_request_sent`
- `dm_request_accepted`
- `dm_request_declined`
- `dm_request_expired`
- `dm_request_blocked`
- `chat_room_viewed`
- `first_message_sent`
- `message_sent`

### 3-5. 포인트 / 결제

- `point_balance_viewed`
- `point_charge_started`
- `point_charge_completed`
- `point_refund_completed`
- `point_history_viewed`

### 3-6. 운영 / 안전

- `report_sheet_viewed`
- `report_submitted`
- `block_confirmed`
- `help_viewed`
- `policy_viewed`

## 4. 핵심 이벤트 정의

### `signup_completed`

발생 시점:

- 가입 폼과 필수 동의가 완료되고 프로필이 생성될 때

권장 속성:

- `gender`
- `age_group`
- `region`
- `has_bio`

### `auto_intro_post_created`

발생 시점:

- 자동 소개글이 생성되었을 때

권장 속성:

- `post_id`
- `is_auto_generated = true`

### `profile_viewed`

발생 시점:

- 타 사용자 프로필을 열람했을 때

권장 속성:

- `target_user_id`
- `source` (`feed`, `search`, `dm`, `direct`)

### `dm_request_sent`

발생 시점:

- DM 요청이 생성되고 90P 차감이 완료되었을 때

권장 속성:

- `room_id`
- `target_user_id`
- `request_cost`
- `sender_gender`
- `target_gender`

### `dm_request_accepted`

발생 시점:

- 수신자가 요청을 수락했을 때

권장 속성:

- `room_id`
- `target_user_id`

### `dm_request_declined`

발생 시점:

- 수신자가 요청을 거절했을 때

권장 속성:

- `room_id`
- `refund_amount`

### `dm_request_expired`

발생 시점:

- 24시간 내 응답이 없어 만료되었을 때

권장 속성:

- `room_id`
- `refund_amount`

### `first_message_sent`

발생 시점:

- 한 채팅방에서 첫 메시지가 전송되었을 때

권장 속성:

- `room_id`
- `sender_id`

### `point_charge_completed`

발생 시점:

- 포인트 충전 완료 시

권장 속성:

- `amount`
- `provider`

### `report_submitted`

발생 시점:

- 신고가 접수되었을 때

권장 속성:

- `report_type` (`profile`, `post`, `chat`)
- `reason`

## 5. 퍼널 기준 이벤트

### 가입 퍼널

`landing_viewed`
-> `login_started`
-> `login_completed`
-> `signup_started`
-> `signup_completed`

### 탐색 퍼널

`home_viewed`
-> `post_viewed`
-> `profile_viewed`
-> `dm_request_sheet_viewed`

### DM 퍼널

`dm_request_sheet_viewed`
-> `dm_request_sent`
-> `dm_request_accepted`
-> `first_message_sent`

## 6. 상태 이벤트와 제품 상태 연결

- `dm_request_sent` = `chat_rooms.status = pending`
- `dm_request_accepted` = `agreed`
- `dm_request_declined` = `declined`
- `dm_request_expired` = `expired`
- `dm_request_blocked` = `blocked`
- `point_refund_completed` = 환불 트랜잭션 반영 완료

## 7. 리텐션 분석용 이벤트

- `home_viewed`
- `profile_viewed`
- `dm_request_sent`
- `dm_request_accepted`
- `first_message_sent`
- `point_charge_completed`

이 이벤트들로 Day 1, Day 3, Day 7 리텐션을 볼 수 있다.

## 8. 여성 / 남성 분리 분석용 속성

이벤트 속성에 아래를 붙이는 것을 권장한다.

- `user_gender`
- `target_gender`
- `is_female_benefit_user`

## 9. 과도하게 추적하지 않아도 되는 것

- 모든 스크롤 위치
- 모든 버튼 hover
- 지나치게 세분화된 체류 이벤트

## 10. 최종 판단

욕망백서의 이벤트 트래킹은 단순 클릭 로그가 아니라  
`가입 -> 탐색 -> 요청 -> 수락 -> 대화 -> 환불/신고` 흐름을 읽기 위한 구조여야 한다.

특히 DM 상태 변화 이벤트는 절대 빠지면 안 된다.
