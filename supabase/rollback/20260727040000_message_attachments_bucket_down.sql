-- 20260727040000_message_attachments_bucket.sql 되돌리기.
--
-- **경고: 버킷을 지우면 그 안의 이미지가 사라진다.** 대화에 올린 사진이 전부 없어진다.
-- 버킷 삭제는 안에 객체가 남아 있으면 실패하므로, 정말 지우려면 먼저 객체를 비운다
-- (그 자체가 되돌릴 수 없는 작업이라 여기서 자동으로 하지 않는다).

drop policy if exists "message-attachments member delete" on storage.objects;
drop policy if exists "message-attachments member insert" on storage.objects;
drop policy if exists "message-attachments member select" on storage.objects;

-- 정책이 이 함수를 참조하므로 정책을 먼저 지운 뒤에 함수를 지운다.
drop function if exists public.can_access_room_folder(text);

-- 버킷은 남긴다. 지우려면 객체를 비운 뒤 아래를 직접 실행한다:
--   delete from storage.buckets where id = 'message-attachments';
