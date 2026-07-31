-- 2026-07-31 : 보안 - 메신저 첨부 - 삭제는 올린 사람만 (사용자 승인)
--
-- `20260727040000_message_attachments_bucket`의 삭제 정책은 **방 멤버 전원**에게 열려 있다:
--
--     using (bucket_id = 'message-attachments' and can_access_room_folder(folder))
--
-- 읽기·쓰기는 그게 맞다(같은 방 사람은 서로의 이미지를 봐야 한다). 그런데 삭제까지 같은
-- 조건을 쓰면 **방에 있는 아무나 남이 올린 이미지를 지울 수 있다.** `rooms.type`에
-- 'direct'·'group'이 있어 사람이 여럿인 방이 설계상 가능하므로 열려 있는 구멍이다.
-- 되돌릴 수 없는 작업(파일 삭제)이라 읽기·쓰기보다 좁아야 한다.
--
-- `owner`는 Storage가 업로드한 세션의 auth.uid()로 채운다. 방 멤버 조건을 **함께** 남기는
-- 이유: 방에서 나간 뒤에도 자기가 올린 파일을 지울 수 있으면, 남은 사람들의 대화에서
-- 이미지만 사라진다. 둘 다 만족해야 지운다.
--
-- 알려진 한계: `owner`가 비어 있는 행(service_role로 올렸거나 아주 예전 업로드)은 이 정책으로
-- **아무도 지울 수 없게 된다.** 느슨하게 열어 두는 쪽(owner is null이면 통과)은 정책을 우회하는
-- 값 하나로 구멍이 다시 열리는 모양이라 택하지 않았다 — 그런 행이 나오면 service_role로 지운다.
-- (2026-07-30 L-22 "안전 게이트의 기본값은 안전한 것만 열거"와 같은 판단.)
drop policy if exists "message-attachments member delete" on storage.objects;

create policy "message-attachments owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-attachments'
    and owner = auth.uid()
    and public.can_access_room_folder((storage.foldername(name))[1])
  );
