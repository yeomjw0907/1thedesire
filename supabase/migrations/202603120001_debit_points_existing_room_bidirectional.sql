-- 기존 방 조회를 양방향으로: (내가 보낸→상대) 뿐 아니라 (상대가 보낸→나) 방도 있으면 해당 방 id 반환
-- 그래야 "이미 매칭된 상대에게 DM 보내기" 시 추가 차감 없이 그 사람과의 DM방으로 이동

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
  -- 이미 (나, 상대) 또는 (상대, 나) 쌍으로 pending/agreed 방이 있으면 해당 방 id 반환 (포인트 차감 없음)
  select id into v_room_id
    from public.chat_rooms
    where (
      (initiator_id = p_initiator_id and receiver_id = p_receiver_id)
      or (initiator_id = p_receiver_id and receiver_id = p_initiator_id)
    )
    and status in ('pending', 'agreed')
    limit 1;
  if found then
    return v_room_id;
  end if;

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

  v_new_balance := v_current_points - p_cost;
  v_expires_at := now() + (p_expires_hours || ' hours')::interval;

  -- 포인트 차감
  update public.profiles
    set points = v_new_balance
    where id = p_initiator_id;

  -- 채팅방 생성: status=agreed, agreed_at=now() (승인 단계 없이 즉시 대화 가능)
  insert into public.chat_rooms (initiator_id, receiver_id, status, request_cost, request_expires_at, agreed_at)
    values (p_initiator_id, p_receiver_id, 'agreed', p_cost, v_expires_at, now())
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
