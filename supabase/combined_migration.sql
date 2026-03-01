-- ============================================================
-- 욕망백서 Combined Migration
-- 생성일: 2026-03-01
-- 실행 방법: Supabase 대시보드 SQL Editor에서 전체 내용 붙여넣기
-- ============================================================

-- ============================================================
-- Migration: 202602280001_extensions_and_helpers.sql
-- ============================================================
-- Extensions
create extension if not exists pgcrypto;

-- Updated-at helper trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Migration: 202602280002_create_profiles.sql
-- ============================================================
-- Profiles
-- 기준 문서: supabase-sql-v0.1.md
-- account_status: active / restricted / suspended / banned (rls-policy-spec 기준)
-- gender_benefit_type: standard / female_starter

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

-- ============================================================
-- Migration: 202602280003_create_posts.sql
-- ============================================================
-- Posts
-- 기준 문서: supabase-sql-v0.1.md

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

-- ============================================================
-- Migration: 202602280004_create_blocks.sql
-- ============================================================
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

-- ============================================================
-- Migration: 202602280005_create_chat_rooms.sql
-- ============================================================
-- Chat rooms
-- DM 요청 상태머신 중심 테이블
-- status: pending / agreed / declined / expired / blocked / closed
-- refund_policy: decline_half_refund / expire_full_refund / blocked_no_refund

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
-- 만료 배치 처리에서 pending + expires_at 조회에 사용
create index if not exists idx_chat_rooms_pending_expires on public.chat_rooms(request_expires_at)
  where status = 'pending';

create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row
execute function public.set_updated_at();

-- ============================================================
-- Migration: 202602280006_create_consent_events.sql
-- ============================================================
-- Consent events
-- 합의 흐름 기록: 요청, 조회, 수락, 거절, 만료, 차단

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

-- ============================================================
-- Migration: 202602280007_create_messages.sql
-- ============================================================
-- Messages
-- agreed 상태의 채팅방에서만 실제 전송 가능 (RLS + 서버 액션에서 제어)

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

-- ============================================================
-- Migration: 202602280008_create_point_transactions.sql
-- ============================================================
-- Point transactions
-- 포인트 변화의 모든 이력 기록
-- 일반 사용자는 직접 생성 불가 (RLS에서 차단)
-- policy_code로 어떤 정책에 의한 거래인지 추적

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
      'manual_adjustment',
      'charge'
    )),
  created_at timestamptz not null default now()
);

create index if not exists idx_point_transactions_user_id_created_at
  on public.point_transactions(user_id, created_at desc);

-- ============================================================
-- Migration: 202602280009_create_payment_events.sql
-- ============================================================
-- Payment events
-- 외부 결제/입금 이벤트 원본 로그

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

-- ============================================================
-- Migration: 202602280010_create_reports.sql
-- ============================================================
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

-- ============================================================
-- Migration: 202602280011_create_moderation_actions.sql
-- ============================================================
-- Moderation actions
-- action_type: warn / restrict / suspend / ban / hide_post (rls-policy-spec 기준)
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

-- ============================================================
-- Migration: 202602280013_enable_rls.sql
-- ============================================================
-- Enable RLS on all tables
-- 기본값: 거부 (deny by default)

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.blocks enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.consent_events enable row level security;
alter table public.messages enable row level security;
alter table public.point_transactions enable row level security;
alter table public.payment_events enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

-- ============================================================
-- Migration: 202602280014_profiles_policies.sql
-- ============================================================
-- Profiles RLS Policies
-- 기준 문서: rls-policy-spec-v0.1.md

-- 공개 프로필 조회: 인증된 사용자는 active 계정의 프로필 조회 가능
create policy "profiles_select_public"
  on public.profiles
  for select
  to authenticated
  using (account_status = 'active' or auth.uid() = id);

-- 본인 프로필 생성: 가입 완료 시 한 번만 생성
-- 주의: 서버 액션(service_role)으로 처리하므로 일반 사용자 insert는 차단
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- 본인 프로필 수정
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- Migration: 202602280015_posts_policies.sql
-- ============================================================
-- Posts RLS Policies
-- 기준 문서: rls-policy-spec-v0.1.md

-- published 게시글 조회: 인증된 사용자 모두 가능
create policy "posts_select_published"
  on public.posts
  for select
  to authenticated
  using (status = 'published' or user_id = auth.uid());

-- 게시글 생성: 인증된 사용자 (자동 소개글 포함)
create policy "posts_insert_own"
  on public.posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- 게시글 수정/삭제: 작성자 본인만
create policy "posts_update_own"
  on public.posts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "posts_delete_own"
  on public.posts
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Migration: 202602280016_chat_and_messages_policies.sql
-- ============================================================
-- Chat rooms & Messages RLS Policies
-- 기준 문서: rls-policy-spec-v0.1.md

-- chat_rooms: 발신자와 수신자만 조회
create policy "chat_rooms_select_participants"
  on public.chat_rooms
  for select
  to authenticated
  using (initiator_id = auth.uid() or receiver_id = auth.uid());

-- chat_rooms: 발신자가 pending 생성
-- 실제 포인트 차감과 함께 service_role로 처리
create policy "chat_rooms_insert_initiator"
  on public.chat_rooms
  for insert
  to authenticated
  with check (initiator_id = auth.uid());

-- chat_rooms: 수신자는 수락/거절 상태로 변경, 차단은 양쪽 모두
create policy "chat_rooms_update_participants"
  on public.chat_rooms
  for update
  to authenticated
  using (initiator_id = auth.uid() or receiver_id = auth.uid());

-- messages: 채팅방 참여자만 조회
create policy "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_rooms cr
      where cr.id = room_id
        and (cr.initiator_id = auth.uid() or cr.receiver_id = auth.uid())
    )
  );

-- messages: agreed 상태 방에서만 전송 가능
create policy "messages_insert_agreed"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms cr
      where cr.id = room_id
        and cr.status = 'agreed'
        and (cr.initiator_id = auth.uid() or cr.receiver_id = auth.uid())
    )
  );

-- consent_events: 참여자만 조회
create policy "consent_events_select_participants"
  on public.consent_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_rooms cr
      where cr.id = room_id
        and (cr.initiator_id = auth.uid() or cr.receiver_id = auth.uid())
    )
  );

-- ============================================================
-- Migration: 202602280017_points_reports_admin_policies.sql
-- ============================================================
-- Point transactions, Reports, Blocks, Moderation RLS
-- 기준 문서: rls-policy-spec-v0.1.md

-- point_transactions: 본인 내역만 조회, 직접 생성 불가 (service_role만 가능)
create policy "point_transactions_select_own"
  on public.point_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- blocks: 본인 차단 목록 조회 및 생성
create policy "blocks_select_own"
  on public.blocks
  for select
  to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "blocks_insert_own"
  on public.blocks
  for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "blocks_delete_own"
  on public.blocks
  for delete
  to authenticated
  using (blocker_id = auth.uid());

-- reports: 본인 생성 가능, 본인 제출 내역 조회
create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "reports_insert_own"
  on public.reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- moderation_actions: 일반 사용자 접근 완전 차단
-- 운영자 접근은 service_role 또는 별도 admin role로 처리

-- payment_events: 본인 결제 내역 일부 조회
create policy "payment_events_select_own"
  on public.payment_events
  for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Migration: 202602280018_storage_post_images.sql
-- ============================================================
-- Supabase Storage: post-images 버킷 생성
-- 게시글 이미지 업로드용 공개 버킷

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- 인증된 사용자: 자신의 폴더에만 업로드 가능
create policy "post_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 읽기
create policy "post_images_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'post-images');

-- 본인 이미지 삭제
create policy "post_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

