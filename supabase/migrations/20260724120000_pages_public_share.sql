-- Phase 12 T1 공개 페이지 공유. 페이지를 공개로 표시하면 /p/<slug>에서 비로그인도 읽기 전용 조회.
-- is_public=공개 여부, public_slug=추측 불가한 랜덤 링크(unique). 일반 페이지는 is_public=false, slug=null.
alter table public.pages
  add column is_public boolean not null default false,
  add column public_slug text unique;

-- 공개 페이지를 slug로 "한 건만" 조회하는 함수. anon 키로 pages에 공개 SELECT 정책을 직접 열면
-- 누구나 is_public=true 행 전량을 열거(enumeration)해 타인 공개 페이지를 덤프할 수 있으므로, 대신
-- security definer 함수로 RLS를 우회하되 요청한 slug 한 건만 반환한다(목록/열거 불가 — 링크를 아는
-- 사람만). search_path 고정으로 정의자 권한 남용(스키마 하이재킹) 방어. 본문 전체를 돌려주므로 stable.
create or replace function public.get_public_page(p_slug text)
returns table (id uuid, title text, content jsonb, icon text, updated_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.title, p.content, p.icon, p.updated_at
  from public.pages p
  where p.public_slug = p_slug and p.is_public = true
  limit 1;
$$;

-- 최소 권한: public(전체)에서 실행 권한 회수 후 anon/authenticated에만 부여.
revoke all on function public.get_public_page(text) from public;
grant execute on function public.get_public_page(text) to anon, authenticated;
