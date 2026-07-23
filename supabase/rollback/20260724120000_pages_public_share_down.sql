-- Phase 12 T1 롤백. 공개 조회 함수 + 공개 컬럼 제거(공개 상태·slug 손실, 페이지 원본은 보존).
drop function if exists public.get_public_page(text);

alter table public.pages
  drop column if exists is_public,
  drop column if exists public_slug;
