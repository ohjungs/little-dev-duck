-- 되돌리기: 대표 이미지 컬럼 제거. 저장된 이미지 URL은 함께 사라진다(원문은 피드에 있으므로
-- 다음 수집에서 다시 채워진다 — 복구 불가한 데이터가 아니다).
alter table public.articles drop column if exists image_url;
