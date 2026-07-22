-- Phase 9 T3: 페이지 첨부(이미지 등) Supabase Storage 버킷 + 본인 폴더 RLS.
-- 경로 규약: '<user_id>/<uuid>.<ext>'. 쓰기/수정/삭제는 인증 사용자의 본인 폴더만 허용하고,
-- 읽기는 public 버킷이라 공개 URL(<img src>)로 노출된다 — 경로가 추측 불가한 UUID라 개인 노트 이미지엔 충분.
-- 이미지 MIME만 허용(액티브 콘텐츠 SVG/HTML 차단) + 10MB 상한. 권위 있는 방어선은 클라이언트가 아니라
-- 버킷 — 공격자가 Storage REST로 임의 content-type 직접 업로드해도 여기서 막힌다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'page-attachments',
  'page-attachments',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "page-attachments own insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'page-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "page-attachments own update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'page-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "page-attachments own delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'page-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
