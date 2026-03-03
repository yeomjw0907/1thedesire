-- DM 방 신고: 신고당한 사용자도 해당 방에 대한 신고 존재 여부를 조회할 수 있도록
-- (입력 잠금 "더이상 대화할수없는 상대입니다" 표시용)
create policy "reports_select_room_target"
  on public.reports
  for select
  to authenticated
  using (
    target_room_id is not null
    and (reporter_id = auth.uid() or target_user_id = auth.uid())
  );
