-- 2026-07-27 : 메신저 - 이미지 첨부 버킷 (Phase 50 T4)
--
-- **page-attachments와 달리 비공개 버킷이다.** 그 버킷은 개인 노트용이라 공개로 두고
-- 추측 불가한 UUID 경로에 기댔지만, 대화 이미지는 **여러 사람이 있는 방**의 것이다.
-- 공개로 두면 **주소를 아는 누구에게나 열린다** — 방에서 나간 사람에게도.
-- 그래서 비공개로 두고 서명 URL로만 접근한다(계획 U-005·K-022).
--
-- 경로 규약: '<room_id>/<uuid>.<ext>'. 첫 칸이 방 id라 **폴더만 보고 멤버인지 판정**할 수 있다.
--
-- 상한 2MB: page-attachments(10MB)보다 낮다. **스토리지가 1GB뿐이고** 대화 이미지는
-- 노트 첨부보다 훨씬 자주 쌓인다. 계획이 "리사이즈는 선택이 아니라 생존 조건"이라 적은 이유다.
-- 클라이언트가 리사이즈해 보내지만 **권위 있는 방어선은 여기(버킷)**다 —
-- 공격자가 Storage REST로 직접 올려도 여기서 막힌다.
--
-- SVG를 허용하지 않는다: 스크립트를 품을 수 있는 액티브 콘텐츠다(page-attachments도 같은 판단).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 폴더 이름(=방 id)으로 멤버 판정
-- ---------------------------------------------------------------------------
-- `is_room_member(uuid)`를 그대로 쓸 수 없다: 폴더 이름은 **텍스트**이고, 방 id 모양이
-- 아닌 값이 들어오면 uuid 캐스트가 **예외를 던져 쿼리 전체가 죽는다.**
-- 정책 안에서 죽으면 "권한 없음"이 아니라 오류가 나므로, 캐스트를 안전하게 감싼다.
create or replace function public.can_access_room_folder(p_folder text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_room uuid;
begin
  begin
    v_room := p_folder::uuid;
  exception
    when others then
      -- 방 id 모양이 아니면 접근 없음. 오류로 터뜨리지 않는다.
      return false;
  end;

  return exists (
    select 1 from public.room_members m
    where m.room_id = v_room
      and m.user_id = auth.uid()
  );
end;
$$;

-- `revoke ... from public`만으로는 anon에 직접 부여된 권한이 남는다(Phase 24의 award_xp 함정).
revoke all on function public.can_access_room_folder(text) from public;
revoke all on function public.can_access_room_folder(text) from anon;
grant execute on function public.can_access_room_folder(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 접근 정책 — 방 멤버만
-- ---------------------------------------------------------------------------
-- 읽기: 비공개 버킷이라 서명 URL을 만들 때도 select 권한이 필요하다.
create policy "message-attachments member select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_room_folder((storage.foldername(name))[1])
  );

create policy "message-attachments member insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and public.can_access_room_folder((storage.foldername(name))[1])
  );

-- 수정은 열지 않는다. 올린 파일을 덮어쓰는 경로가 있으면 **남이 본 이미지가 뒤바뀐다.**
-- 바꾸고 싶으면 지우고 다시 올린다.
create policy "message-attachments member delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_room_folder((storage.foldername(name))[1])
  );
