# 같은 폴더를 쓰는 다른 세션의 작업을 내 커밋이 삼켰다 (2026-08-02)

## 무슨 일이 있었나

`b3f7cd1`("feat(sheet): T2·T3 — 수식 파서 + 평가기 + 의존성 그래프")은 커밋 메시지가
스프레드시트 엔진만 말하는데, **실제로는 다른 세션이 만들던 페이지 본문 유실 수정이 함께
들어갔다.** 내가 `git add -A`로 작업 트리 전체를 담았기 때문이다.

딸려 들어간 것(내가 쓰지 않았다):

| 파일 | 내용 |
|---|---|
| `apps/web/src/components/PageWorkspace.tsx` | **본문 유실 수정** — `listPages`는 전송량을 아끼려 `content` 컬럼을 빼고 오는데, 목록에서 연 페이지는 그 얕은 레코드를 그대로 써서 본문이 비어 보였다. `content == null`일 때만 `getPage`로 채우는 effect 추가 |
| `apps/web/src/components/__tests__/PageEditor.test.tsx` | 신규 350줄 |
| `apps/web/src/components/__tests__/PageWorkspace.test.tsx` | 신규 338줄 |
| `apps/web/src/components/__tests__/BlockEditor.test.tsx` | 신규 85줄 |
| `apps/web/e2e/pages-workspace.spec.ts` | 신규 130줄 |
| `apps/web/e2e/cleanup.ts` | 5줄 수정 |

## 상태는 정상이다

커밋 시점에 전체 검증이 통과했고(11개 패키지 GREEN · lint 0 · tsc), 푸시 후 CI도
`lint-and-test` · `db-tests` · `e2e` 전부 성공했다. **깨진 것은 없다.** 문제는 기록이
사실과 다르다는 것 하나다 — 나중에 이 커밋을 찾는 사람이 본문 유실 수정을 여기서 찾지 못한다.

## 왜 이런 일이 생기나

CLAUDE.md 3-3이 정한 것: **병렬은 git worktree 분리 세션으로 한다.** 지금은 두 세션이
같은 폴더를 공유하고 있어서 한쪽의 `git add -A`가 다른 쪽의 진행 중 파일을 담는다.
이 저장소에 이미 같은 일이 있었다(`61cef3b` — "다른 세션이 동시에 작업하다 함께 커밋했다").

커밋 직후 확인하니 `pages-workspace.spec.ts`가 **여전히 수정되고 있었다.** 즉 상대 세션은
그때도 작업 중이었고, 나는 그 작업의 중간 상태를 커밋한 셈이다.

## 되돌리지 않은 이유

이미 푸시됐고 CI도 돌았다. 여기서 히스토리를 다시 쓰면 **아직 작업 중인 상대 세션의 기준점이
사라진다** — 그쪽이 다음 커밋을 만들 때 충돌하거나, 최악에는 그 세션의 변경이 유실된다.
잘못된 기록은 문서로 고칠 수 있지만 남의 작업을 날리는 것은 되돌릴 수 없다.

## 다음부터

- **`git add -A`를 쓰지 않는다.** 내가 만진 경로만 명시해 stage한다.
- 커밋 전에 `git status`를 읽고 **내가 만들지 않은 변경이 있으면 멈추고 사용자에게 알린다.**
- 두 세션을 동시에 돌릴 거라면 worktree를 나눈다(CLAUDE.md 3-3).
