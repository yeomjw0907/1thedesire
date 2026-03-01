-- 포인트 차감 + 채팅방 생성 + 트랜잭션 로그를 하나의 트랜잭션으로 처리
-- 기존 dm.ts의 분리된 조회→update→insert 패턴을 원자적 RPC로 대체

create or replace function public.debit_points_and_create_room(
  p_initiator_id uuid,
  p_receiver_id uuid,
  p_cost integer,
  p_expires_hours integer default 24
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_current_points integer;
  v_new_balance integer;
  v_room_id uuid;
  v_expires_at timestamptz;
begin
  -- 잔액 확인 (FOR UPDATE로 동시 요청 시 race condition 방지)
  select points into v_current_points
    from public.profiles
    where id = p_initiator_id
    for update;

  if v_current_points is null then
    raise exception 'USER_NOT_FOUND: 사용자를 찾을 수 없습니다';
  end if;

  if v_current_points < p_cost then
    raise exception 'INSUFFICIENT_POINTS: 포인트가 부족합니다';
  end if;

  -- 이미 pending인 요청 확인
  perform 1 from public.chat_rooms
    where initiator_id = p_initiator_id
      and receiver_id = p_receiver_id
      and status = 'pending';
  if found then
    raise exception 'ALREADY_PENDING: 이미 대기 중인 요청이 있습니다';
  end if;

  v_new_balance := v_current_points - p_cost;
  v_expires_at := now() + (p_expires_hours || ' hours')::interval;

  -- 포인트 차감
  update public.profiles
    set points = v_new_balance
    where id = p_initiator_id;

  -- 채팅방 생성
  insert into public.chat_rooms (initiator_id, receiver_id, status, request_cost, request_expires_at)
    values (p_initiator_id, p_receiver_id, 'pending', p_cost, v_expires_at)
    returning id into v_room_id;

  -- 트랜잭션 로그
  insert into public.point_transactions (user_id, type, amount, balance_after, reference_type, reference_id, policy_code, description)
    values (p_initiator_id, 'debit', -p_cost, v_new_balance, 'chat_room', v_room_id, 'dm_request_cost', 'DM 요청');

  -- 동의 이벤트
  insert into public.consent_events (room_id, actor_id, event_type, metadata)
    values (v_room_id, p_initiator_id, 'request_created', jsonb_build_object('request_cost', p_cost));

  return v_room_id;
end;
$$;

-- 거절 환불을 원자적으로 처리
create or replace function public.decline_and_refund(
  p_room_id uuid,
  p_actor_id uuid,
  p_refund_amount integer
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_room record;
  v_initiator_points integer;
  v_new_balance integer;
begin
  -- 방 정보 확인
  select * into v_room
    from public.chat_rooms
    where id = p_room_id
    for update;

  if v_room is null then
    raise exception 'NOT_FOUND: 요청을 찾을 수 없습니다';
  end if;
  if v_room.receiver_id != p_actor_id then
    raise exception 'FORBIDDEN: 수신자만 거절할 수 있습니다';
  end if;
  if v_room.status != 'pending' then
    return false;
  end if;

  -- 상태 전이
  update public.chat_rooms
    set status = 'declined',
        refund_amount = p_refund_amount,
        refund_policy = 'decline_half_refund',
        declined_at = now()
    where id = p_room_id and status = 'pending';

  -- 환불
  select points into v_initiator_points
    from public.profiles
    where id = v_room.initiator_id
    for update;

  v_new_balance := v_initiator_points + p_refund_amount;

  update public.profiles
    set points = v_new_balance
    where id = v_room.initiator_id;

  insert into public.point_transactions (user_id, type, amount, balance_after, reference_type, reference_id, policy_code, description)
    values (v_room.initiator_id, 'refund', p_refund_amount, v_new_balance, 'chat_room', p_room_id, 'dm_decline_refund_half', 'DM 거절 환불 (' || p_refund_amount || 'P)');

  -- 동의 이벤트
  insert into public.consent_events (room_id, actor_id, event_type, metadata)
    values (p_room_id, p_actor_id, 'agreement_declined', jsonb_build_object('refund_amount', p_refund_amount));

  return true;
end;
$$;

-- 관리자 수동 포인트 조정을 원자적으로 처리
create or replace function public.adjust_points_atomic(
  p_target_user_id uuid,
  p_amount integer,
  p_reason text,
  p_actor_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_current_points integer;
  v_new_balance integer;
begin
  select points into v_current_points
    from public.profiles
    where id = p_target_user_id
    for update;

  if v_current_points is null then
    raise exception 'NOT_FOUND: 사용자를 찾을 수 없습니다';
  end if;

  v_new_balance := v_current_points + p_amount;
  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_POINTS: 포인트가 0 미만이 됩니다';
  end if;

  update public.profiles set points = v_new_balance where id = p_target_user_id;

  insert into public.point_transactions (user_id, type, amount, balance_after, policy_code, description)
    values (p_target_user_id, 'manual_adjustment', p_amount, v_new_balance, 'manual_adjustment', '[관리자] ' || p_reason);

  return v_new_balance;
end;
$$;
