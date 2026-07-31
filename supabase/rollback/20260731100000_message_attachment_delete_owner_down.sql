-- 되돌리기: 삭제 권한을 다시 방 멤버 전원에게 연다(20260727040000의 원래 정책).
drop policy if exists "message-attachments owner delete" on storage.objects;

create policy "message-attachments member delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_room_folder((storage.foldername(name))[1])
  );
