# 욕망백서 Supabase SQL 초안 v0.1

## 1. 목적

- 현재 PRD, 정책, 상태도 문서를 기준으로 Supabase에서 바로 시작 가능한 SQL 초안을 정리한다.
- MVP 기준 핵심 테이블, 제약조건, 인덱스, 기본 트리거까지 포함한다.

## 2. 전제

- Supabase Auth의 `auth.users`를 회원 기준으로 사용한다.
- 포인트, DM 상태, 환불, 신고, 차단을 MVP 범위로 포함한다.
- RLS 정책은 본 문서에서 방향만 제시하고, 실제 정책은 별도 문서로 확장 가능하게 둔다.

## 3. SQL 초안

```sql
-- Extensions
create extension if not exists pgcrypto;

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  gender text not null check (gender in ('male', 'female', 'other')),
  age_group text not null,
  region text not null,
  role text not null,
  bio text not null,
  points integer not null default 0 check (points >= 0),
  gender_benefit_type text not null default 'standard'
    check (gender_benefit_type in ('standard', 'female_starter')),
  is_adult_checked boolean not null default false,
  adult_checked_at timestamptz,
  account_status text not null default 'active'
    check (account_status in ('active', 'restricted', 'suspended', 'banned')),
  reported_count integer not null default 0 check (reported_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  is_auto_generated boolean not null default false,
  status text not null default 'published'
    check (status in ('draft', 'published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_status_created_at on public.posts(status, created_at desc);

create trigger set_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

-- Blocks
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_unique unique (blocker_id, blocked_id),
  constraint blocks_self_block check (blocker_id <> blocked_id)
);

create index if not exists idx_blocks_blocker_id on public.blocks(blocker_id);
create index if not exists idx_blocks_blocked_id on public.blocks(blocked_id);

-- Chat rooms
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'agreed', 'declined', 'expired', 'blocked', 'closed')),
  request_cost integer not null default 90 check (request_cost >= 0),
  refund_amount integer not null default 0 check (refund_amount >= 0),
  refund_policy text not null default 'decline_half_refund'
    check (refund_policy in ('decline_half_refund', 'expire_full_refund', 'blocked_no_refund')),
  agreed_at timestamptz,
  declined_at timestamptz,
  expired_at timestamptz,
  blocked_at timestamptz,
  request_expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_rooms_not_self check (initiator_id <> receiver_id)
);

create index if not exists idx_chat_rooms_initiator_id on public.chat_rooms(initiator_id);
create index if not exists idx_chat_rooms_receiver_id on public.chat_rooms(receiver_id);
create index if not exists idx_chat_rooms_status_created_at on public.chat_rooms(status, created_at desc);

create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row
execute function public.set_updated_at();

-- Consent events
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'request_created',
      'request_viewed',
      'agreement_accepted',
      'agreement_declined',
      'request_expired',
      'blocked'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_events_room_id on public.consent_events(room_id);
create index if not exists idx_consent_events_actor_id on public.consent_events(actor_id);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text not null default 'text'
    check (message_type in ('text', 'system')),
  message_status text not null default 'active'
    check (message_status in ('active', 'deleted', 'flagged')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_messages_room_id_created_at on public.messages(room_id, created_at asc);
create index if not exists idx_messages_sender_id on public.messages(sender_id);

-- Point transactions
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('signup_bonus', 'charge', 'debit', 'refund', 'manual_adjustment')),
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  description text,
  policy_code text not null
    check (policy_code in (
      'signup_bonus_female',
      'dm_request_cost',
      'dm_decline_refund_half',
      'dm_expire_refund_full',
      'manual_adjustment'
    )),
  created_at timestamptz not null default now()
);

create index if not exists idx_point_transactions_user_id_created_at
  on public.point_transactions(user_id, created_at desc);

-- Payment events
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  status text not null,
  amount integer not null check (amount >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_events_user_id_created_at
  on public.payment_events(user_id, created_at desc);

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_post_id uuid references public.posts(id) on delete set null,
  target_room_id uuid references public.chat_rooms(id) on delete set null,
  reason text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_status_created_at on public.reports(status, created_at desc);

-- Moderation actions
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null
    check (action_type in ('warn', 'restrict', 'suspend', 'ban', 'hide_post')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_actions_target_user_id_created_at
  on public.moderation_actions(target_user_id, created_at desc);
```

## 4. 기본 트랜잭션 규칙

### 여성 가입 보너스

- `profiles.gender = 'female'`인 경우 가입 완료 시 `270P`를 지급한다.
- `point_transactions`에 `signup_bonus_female` 로그를 남긴다.

### DM 요청 생성

- 발신자 포인트가 `90` 이상인지 확인한다.
- `chat_rooms.status = 'pending'` 생성
- 발신자 포인트 `90P` 차감
- `point_transactions`에 `dm_request_cost` 기록
- `consent_events`에 `request_created` 기록

### DM 거절

- `chat_rooms.status = 'declined'`
- `refund_amount = 45`
- 발신자에게 `45P` 환불
- `point_transactions`에 `dm_decline_refund_half` 기록
- `consent_events`에 `agreement_declined` 기록

### DM 만료

- `chat_rooms.status = 'expired'`
- `refund_amount = 90`
- 발신자에게 `90P` 환불
- `point_transactions`에 `dm_expire_refund_full` 기록
- `consent_events`에 `request_expired` 기록

### DM 수락

- `chat_rooms.status = 'agreed'`
- `agreed_at` 기록
- `consent_events`에 `agreement_accepted` 기록
- 이후 메시지 송수신은 무료

## 5. RLS 방향 초안

### profiles

- 본인 프로필은 수정 가능
- 공개 프로필 조회는 허용하되, 추후 공개 범위 제어가 생기면 세분화

### posts

- 본인 게시글만 수정/삭제 가능
- `published` 상태만 일반 조회 허용

### chat_rooms

- 발신자와 수신자만 조회 가능
- 상태 변경은 역할별로 제한

### messages

- `agreed` 상태 방의 참여자만 작성 가능
- 차단 상태면 작성 불가

### point_transactions

- 본인 내역만 조회 가능
- 일반 사용자는 생성/수정 불가

## 6. 구현 메모

- 포인트 증감과 채팅 상태 변경은 가능하면 하나의 서버 액션 또는 트랜잭션으로 묶는다.
- `chat_rooms.status` 변경만으로 환불이 중복 실행되지 않도록 서버에서 idempotency를 보장해야 한다.
- `request_expires_at` 만료 처리는 cron 또는 scheduled function으로 처리한다.
- 가입 보너스 중복 지급 방지를 위해 최초 가입 여부 확인 로직이 필요하다.

## 7. 다음 단계

이 SQL 초안 다음에는 아래가 필요하다.

1. 실제 Supabase SQL 마이그레이션 파일 작성
2. RLS 정책 SQL 작성
3. Edge Function 또는 서버 액션 흐름 정의
