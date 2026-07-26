// 2026-07-26 : 오류 - 미적용마이그레이션 - 사람말로 (Phase 37)
// `lessons-learned.md`의 "미적용 마이그레이션의 컬럼을 payload에 실으면 그 테이블 쓰기가 통째로
// 죽는다"의 후속. 그 교훈은 **payload 쪽**을 고쳤는데(값이 있을 때만 키를 넣는다),
// **사용자가 무엇을 보는가**는 그대로였다.
//
// 지금 실제로 일어나는 일: 마이그레이션 4건이 적용 대기라 `profiles.dashboard_layout` 컬럼이
// 실서버에 없다. 사용자가 설정에서 대시보드 카드 순서를 바꾸면 화면이 되돌아가면서
// **"저장하지 못했어요: Could not find the 'dashboard_layout' column ... in the schema cache"**가
// 뜬다. 자기가 뭘 잘못했는지 의심하게 되는데, 사실은 **알려진 대기 상태**다.
//
// 이 저장소의 관례 그대로다 — "정체 모를 실패 대신 왜 안 되는지 말한다"(backup-parse.ts).

// 컬럼이 없다는 신호만 좁게 본다. **과하게 잡으면 진짜 원인을 가린다** —
// 모르는 오류는 원문을 보여주는 편이 낫다.
const MISSING_COLUMN = [
  // PostgREST: 스키마 캐시에 컬럼이 없을 때
  /could not find the '[^']*' column/i,
  /\bPGRST204\b/,
  // Postgres 원문
  /column "[^"]*" does not exist/i,
];

export function pendingMigrationMessage(raw: string): string | null {
  if (raw.trim() === "") return null;
  if (!MISSING_COLUMN.some((re) => re.test(raw))) return null;
  return "아직 준비되지 않은 기능이에요. 데이터베이스 변경이 적용되면 저장됩니다(관리자 조치 필요).";
}
