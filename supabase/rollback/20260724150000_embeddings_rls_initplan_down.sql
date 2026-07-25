-- 2026-07-24 embeddings RLS initplan 최적화 롤백. 정책을 (select auth.uid()) 이전 형태로
-- 되돌린다. 접근 범위는 동일하고 per-row 재평가로 돌아가는 성능 되돌림일 뿐이다
-- (보안이 느슨해지지 않는다 -- 두 표현식의 판정 결과는 같다).
drop policy if exists "embeddings_select_own" on public.embeddings;
drop policy if exists "embeddings_insert_own" on public.embeddings;
drop policy if exists "embeddings_update_own" on public.embeddings;
drop policy if exists "embeddings_delete_own" on public.embeddings;

create policy "embeddings_select_own" on public.embeddings
  for select using (user_id = auth.uid());
create policy "embeddings_insert_own" on public.embeddings
  for insert with check (user_id = auth.uid());
create policy "embeddings_update_own" on public.embeddings
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "embeddings_delete_own" on public.embeddings
  for delete using (user_id = auth.uid());
