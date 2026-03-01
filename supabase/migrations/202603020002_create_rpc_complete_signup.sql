-- 회원가입 완료를 원자적으로 처리: 프로필 생성 + 포인트 지급 + 자동 게시글
-- 기존 signup.ts의 분리된 insert 3건을 하나의 트랜잭션으로 묶음

create or replace function public.complete_signup_atomic(
  p_user_id uuid,
  p_nickname text,
  p_gender text,
  p_age_group text,
  p_region text,
  p_role text,
  p_bio text,
  p_auto_post_content text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_is_female boolean;
  v_initial_points integer;
  v_post_id uuid;
begin
  -- 이미 프로필이 있으면 중복 가입 방지
  perform 1 from public.profiles where id = p_user_id;
  if found then
    raise exception 'ALREADY_EXISTS: 이미 가입된 사용자입니다';
  end if;

  -- 닉네임 중복 확인
  perform 1 from public.profiles where nickname = p_nickname;
  if found then
    raise exception 'NICKNAME_TAKEN: 이미 사용 중인 이름입니다';
  end if;

  v_is_female := (p_gender = 'female');
  v_initial_points := case when v_is_female then 270 else 0 end;

  -- 1. 프로필 생성
  insert into public.profiles (
    id, nickname, gender, age_group, region, role, bio,
    points, gender_benefit_type,
    is_adult_checked, adult_checked_at, account_status
  ) values (
    p_user_id, p_nickname, p_gender, p_age_group, p_region, p_role, p_bio,
    v_initial_points, case when v_is_female then 'female_starter' else 'standard' end,
    true, now(), 'active'
  );

  -- 2. 여성 가입 보너스 포인트 기록
  if v_is_female then
    insert into public.point_transactions (
      user_id, type, amount, balance_after,
      reference_type, reference_id, description, policy_code
    ) values (
      p_user_id, 'signup_bonus', 270, 270,
      'profile', p_user_id, '여성 가입 보너스', 'signup_bonus_female'
    );
  end if;

  -- 3. 자동 소개글 생성
  insert into public.posts (user_id, content, is_auto_generated, status)
    values (p_user_id, p_auto_post_content, true, 'published')
    returning id into v_post_id;

  return jsonb_build_object(
    'is_female', v_is_female,
    'initial_points', v_initial_points,
    'post_id', v_post_id
  );
end;
$$;
