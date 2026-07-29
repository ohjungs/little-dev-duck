// 2026-07-29 : 설정 - 버전 정보 (Phase 56 T2 T-023)
// "v1.0.0" 하드코딩은 어떤 배포와도 무관했다(정직 위반). Vercel이 빌드에 넣어 주는
// 커밋 해시(VERCEL_GIT_COMMIT_SHA)를 보여준다 — 서버 컴포넌트에서 읽고, 비밀이 아니다.

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/** 배포 커밋 라벨. 해시가 없거나(로컬) 형식이 아니면 "개발 빌드" — 아는 척하지 않는다. */
export function buildLabel(sha: string | undefined): string {
  if (!sha || !SHA_RE.test(sha)) return "개발 빌드";
  return `배포 ${sha.slice(0, 7)}`;
}
