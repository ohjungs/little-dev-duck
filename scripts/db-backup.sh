#!/usr/bin/env bash
# 2026-07-29 : 운영 - DB 백업 덤프 (Phase 58 T1 V-010)
#
# 무료 플랜에는 자동 백업이 없다. 메신저에는 지우면 복구 수단이 없는 개인 대화가 쌓인다 —
# 이 스크립트가 그 대비다. **DB URL은 시크릿이다**: 환경변수로만 받고, 어디에도 적지 않는다.
#   사용법:  SUPABASE_DB_URL='postgresql://...' bash scripts/db-backup.sh
#   URL 위치: Supabase 대시보드 → Project Settings → Database → Connection string (URI)
#
# 산출물: backup/ldd-dump-YYYYMMDD-HHMMSS.sql  (backup/은 .gitignore — 개인 대화가
# 저장소에 커밋되면 안 된다. 보관은 로컬 + 본인 소유의 사적 저장소로.)
# 복구 절차·리허설: docs/runbooks/backup-restore.md

set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "오류: SUPABASE_DB_URL 환경변수가 없습니다." >&2
  echo "  SUPABASE_DB_URL='postgresql://...' bash scripts/db-backup.sh" >&2
  exit 1
fi

OUT_DIR="$(dirname "$0")/../backup"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/ldd-dump-$STAMP.sql"

# supabase CLI 우선(로그인 불필요 — --db-url 직결), 없으면 pg_dump 직접.
if command -v supabase >/dev/null 2>&1; then
  supabase db dump --db-url "$SUPABASE_DB_URL" -f "$OUT_FILE"
elif command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -f "$OUT_FILE"
else
  echo "오류: supabase CLI도 pg_dump도 없습니다. 하나를 설치해 주세요." >&2
  echo "  supabase: https://supabase.com/docs/guides/local-development" >&2
  exit 1
fi

# 산출물 검증 — 빈 파일을 백업이라 부르면 최악이다(파일은 있는데 복구가 안 된다).
if [ ! -s "$OUT_FILE" ]; then
  echo "오류: 덤프 파일이 비어 있습니다: $OUT_FILE" >&2
  exit 1
fi

SIZE=$(wc -c < "$OUT_FILE")
echo "완료: $OUT_FILE (${SIZE} bytes)"
echo "주의: 이 파일에는 개인 대화가 들어 있습니다. 저장소에 커밋하지 말고 사적으로 보관하세요."
