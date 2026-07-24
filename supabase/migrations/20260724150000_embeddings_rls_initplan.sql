-- 2026-07-24: embeddings RLS initplan 수정 — auth.uid() → (select auth.uid())
-- 성능: per-row 재평가 대신 per-statement 1회 평가. pages 테이블은 이미 이 패턴을 사용 중.

DROP POLICY "embeddings_select_own" ON public.embeddings;
DROP POLICY "embeddings_insert_own" ON public.embeddings;
DROP POLICY "embeddings_update_own" ON public.embeddings;
DROP POLICY "embeddings_delete_own" ON public.embeddings;

CREATE POLICY "embeddings_select_own" ON public.embeddings
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "embeddings_insert_own" ON public.embeddings
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "embeddings_update_own" ON public.embeddings
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "embeddings_delete_own" ON public.embeddings
  FOR DELETE USING (user_id = (select auth.uid()));
