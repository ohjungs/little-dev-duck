-- 롤백: page-attachments 버킷 정책 + 버킷 제거.
-- 버킷에 객체가 남아 있으면 버킷 삭제가 실패하므로 먼저 객체를 비운다(첨부는 부가 데이터라 손실 허용 —
-- 페이지 본문/원본은 pages 테이블에 보존됨).
drop policy if exists "page-attachments own insert" on storage.objects;
drop policy if exists "page-attachments own update" on storage.objects;
drop policy if exists "page-attachments own delete" on storage.objects;

delete from storage.objects where bucket_id = 'page-attachments';
delete from storage.buckets where id = 'page-attachments';
