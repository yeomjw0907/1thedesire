# 욕망백서 백엔드 구현 체크리스트 v0.1

## 1. 목적

- 백엔드 구현 시 필요한 데이터 구조, 상태 전이, 권한, 예외 처리를 체크리스트로 정리한다.
- 다음 작업자가 Supabase 및 서버 액션 구현에 바로 착수할 수 있게 한다.

## 2. 공통 기준

- 상태값 중심 설계
- 포인트 증감은 로그 기반
- RLS는 접근 제어 중심
- 비즈니스 로직은 서버 액션 또는 함수에서 처리
- 환불 중복 방지 필요

## 3. DB 구조

- `profiles`
- `posts`
- `blocks`
- `chat_rooms`
- `consent_events`
- `messages`
- `point_transactions`
- `payment_events`
- `reports`
- `moderation_actions`

## 4. 프로필 관련

- Auth user와 profile 연결
- 닉네임 unique
- 성별, 연령대, 지역, 성향, 자기소개 저장
- account status 관리
- updated_at 처리

## 5. 가입 완료 처리

- 프로필 생성
- 여성 여부 확인
- 여성 가입 보너스 270P 지급
- `point_transactions` 기록
- 자동 소개글 생성

## 6. 게시글 처리

- 게시글 생성
- 자동 소개글 `is_auto_generated`
- 게시글 상태 `draft / published / hidden / deleted`
- 작성자 본인 수정/삭제

## 7. 차단 처리

- `blocks` 생성
- self-block 방지
- 차단 관계 확인 함수 또는 공통 로직
- 차단 시 DM 요청 방지
- 차단 시 메시지 전송 방지

## 8. DM 요청 처리

- 포인트 잔액 확인
- 차단 관계 확인
- `chat_rooms pending` 생성
- `request_cost = 90`
- `request_expires_at = now + 24h`
- 발신자 포인트 차감
- `point_transactions dm_request_cost` 기록
- `consent_events request_created` 기록

## 9. DM 수락 처리

- room 상태가 `pending`인지 확인
- 수신자만 수락 가능
- `status = agreed`
- `agreed_at` 기록
- `consent_events agreement_accepted` 기록

## 10. DM 거절 처리

- room 상태가 `pending`인지 확인
- 수신자만 거절 가능
- `status = declined`
- `declined_at` 기록
- `refund_amount = 45`
- 발신자 45P 환불
- `point_transactions dm_decline_refund_half` 기록
- `consent_events agreement_declined` 기록

## 11. DM 만료 처리

- 24시간 경과한 pending room 조회
- `status = expired`
- `expired_at` 기록
- `refund_amount = 90`
- 발신자 90P 환불
- `point_transactions dm_expire_refund_full` 기록
- `consent_events request_expired` 기록

## 12. DM 차단 처리

- pending 또는 agreed 상태에서 blocked 처리 가능
- `status = blocked`
- `blocked_at` 기록
- 환불 없음
- `consent_events blocked` 기록

## 13. 메시지 처리

- room 상태가 `agreed`일 때만 전송 가능
- 참여자만 전송 가능
- message type `text / system`
- message status `active / deleted / flagged`

## 14. 포인트 / 결제 처리

- point_transactions는 사용자 직접 생성 불가
- payment_events는 시스템 생성
- 입금 예외 처리 문서 기준 수동 조정 가능
- balance_after 일관성 검증

## 15. 신고 처리

- profile / post / chat 신고 생성 가능
- report 상태 `open / reviewing / resolved / dismissed`
- 운영자만 상태 변경 가능

## 16. 운영 액션 처리

- moderation_actions 저장
- `warn / restrict / suspend / ban / hide_post`
- 운영자 권한만 허용

## 17. RLS

- profiles: 본인 수정, 공개 조회
- posts: published만 일반 조회
- chat_rooms: 참여자만 조회
- messages: 참여자 + agreed 상태일 때 작성
- point_transactions: 본인 조회만
- reports: 본인 생성, 운영자 조회/수정
- moderation_actions: 운영자 전용

## 18. 이벤트 트래킹

- signup_completed
- auto_intro_post_created
- profile_viewed
- dm_request_sent
- dm_request_accepted
- dm_request_declined
- dm_request_expired
- first_message_sent
- point_charge_completed
- point_refund_completed
- report_submitted

## 19. 예외 처리

- 입금자명 불일치
- 중복 입금
- 중복 환불
- 중복 포인트 지급
- status transition race condition

## 20. 백엔드 구현 순서

1. 마이그레이션 파일
2. RLS
3. 가입 완료 처리
4. DM 상태 전이 처리
5. 포인트 로그 처리
6. 신고 / 차단 처리
7. 결제 예외 처리
8. 이벤트 트래킹

## 21. 최종 판단

백엔드 구현의 핵심은 `기능이 돌아가는 것`보다  
`상태와 포인트가 절대 어긋나지 않게 하는 것`이다.
