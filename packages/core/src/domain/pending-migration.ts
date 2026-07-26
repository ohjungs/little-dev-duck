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

// 2026-07-27 : 오류 - 미적용마이그레이션 - 테이블없음도 (Phase 50 T2)
// 위 목록은 **컬럼**이 없을 때만 잡는다. 메신저는 테이블 자체가 아직 없어서 여기 걸리지
// 않았고, 사용자는 "Could not find the table 'public.rooms' in the schema cache" 원문을
// 그대로 보게 된다. 같은 부류(알려진 대기 상태)이므로 같은 자리에서 잡는다.
const MISSING_TABLE = [
  // PostgREST: 스키마 캐시에 테이블이 없을 때
  /could not find the table '[^']*'/i,
  /\bPGRST205\b/,
  // Postgres 원문
  /relation "[^"]*" does not exist/i,
];

export function pendingMigrationMessage(raw: string): string | null {
  if (raw.trim() === "") return null;
  if (MISSING_COLUMN.some((re) => re.test(raw))) {
    return "아직 준비되지 않은 기능이에요. 데이터베이스 변경이 적용되면 저장됩니다(관리자 조치 필요).";
  }
  // 테이블이 통째로 없으면 저장뿐 아니라 **읽기도 안 된다** — 문구를 그에 맞춘다.
  // "저장됩니다"라고 하면 화면을 열지도 못하는 사람에게 엉뚱한 안내가 된다.
  if (MISSING_TABLE.some((re) => re.test(raw))) {
    return "아직 준비되지 않은 기능이에요. 데이터베이스 변경이 적용되면 사용할 수 있어요(관리자 조치 필요).";
  }
  return null;
}
