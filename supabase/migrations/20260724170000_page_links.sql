-- 페이지 간 링크 관계. 에디터에서 [[페이지]] 링크를 삽입하면 source→target 행 생성.
-- 백링크 조회: target_page_id로 필터하면 "이 페이지를 참조하는 페이지들" 목록.
CREATE TABLE public.page_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  target_page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_page_id, target_page_id)
);

CREATE INDEX page_links_target_idx ON public.page_links(target_page_id);

ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own page links select" ON public.page_links
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "own page links insert" ON public.page_links
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "own page links delete" ON public.page_links
  FOR DELETE USING (user_id = (select auth.uid()));
