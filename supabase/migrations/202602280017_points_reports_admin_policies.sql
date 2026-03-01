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
