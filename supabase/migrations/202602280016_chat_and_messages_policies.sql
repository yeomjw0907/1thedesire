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
