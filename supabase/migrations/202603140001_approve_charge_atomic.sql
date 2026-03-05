-- 충전 승인 원자적 처리
-- 기존 approveCharge는 point_transactions UPDATE → profiles UPDATE 두 번 분리 → 레이스 컨디션 가능
-- 이 함수는 FOR UPDATE 락으로 두 테이블을 하나의 트랜잭션에서 처리

create or replace function public.approve_charge_atomic(
  p_transaction_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row record;
  v_current_points integer;
  v_new_balance integer;
begin
  -- 트랜잭션 행 잠금 (중복 승인 방지)
  select * into v_row
    from public.point_transactions
    where id = p_transaction_id
      and type = 'charge'
    for update;

  if not found then
    raise exception 'NOT_FOUND: 해당 충전 요청을 찾을 수 없습니다';
  end if;

  if v_row.charge_status != 'pending' then
    raise exception 'ALREADY_PROCESSED: 이미 처리된 요청입니다';
  end if;

  -- 사용자 포인트 잠금 후 조회 (동시 차감과의 레이스 컨디션 방지)
  select points into v_current_points
    from public.profiles
    where id = v_row.user_id
    for update;

  if v_current_points is null then
    raise exception 'USER_NOT_FOUND: 사용자를 찾을 수 없습니다';
  end if;

  v_new_balance := v_current_points + v_row.amount;

  -- 포인트 반영
  update public.profiles
    set points = v_new_balance
    where id = v_row.user_id;

  -- 충전 트랜잭션 완료 처리
  update public.point_transactions
    set charge_status = 'completed',
        balance_after = v_new_balance
    where id = p_transaction_id;

  -- 알림 (실패해도 rollback 하지 않음 - best effort)
  begin
    insert into public.notifications (user_id, type, message)
      values (v_row.user_id, 'charge_completed', '정상적으로 충전되었습니다.');
  exception when others then
    null; -- 알림 실패는 무시
  end;

  return jsonb_build_object(
    'user_id', v_row.user_id,
    'amount', v_row.amount,
    'new_balance', v_new_balance
  );
end;
$$;
