# Status.md — 현재 Phase 진행 현황

현재 Phase: **2 구현 완료** — 배포됨, 사용자 실사용 클릭 검증 대기
계획 문서: docs/plans/phase_01.md(완료), docs/plans/phase_02.md(구현 완료)
재개 방법: 새 대화에서 /next-step (Phase 2 검증 결과부터 확인)

## Phase 2 — 투두 + 메모 위젯

- [x] T1 packages/api CRUD 계약 (listTodos/createTodo/updateTodo/deleteTodo, 메모 동일) — 13개 테스트 통과
- [x] T2 투두 위젯 (오늘 필터, 낙관적 업데이트, 빈/에러/로딩 상태)
- [x] T3 메모 위젯 (목록/작성/수정/삭제, 빈/에러/로딩 상태)
- [x] T4 홈 화면을 위젯 대시보드로 교체

전 패키지 `pnpm build && pnpm lint && pnpm test` 통과. 배포 완료(push -> 자동배포,
https://web-sepia-one-88.vercel.app). 인증이 필요한 화면이라 curl로는 위젯 렌더링까지
확인 불가 — **사용자가 실제 로그인 후 투두/메모 CRUD를 한 번 확인해야 Phase 2를 종료할 수 있다.**

## 검증 체크리스트 (docs/plans/phase_02.md와 동일)

1. 투두 추가 -> 새로고침해도 유지 -> 완료 토글 -> 삭제
2. 메모 작성 -> 수정 -> 삭제
3. (선택) 네트워크 끊고 액션 시도 -> 에러 상태 노출 확인
4. (선택) 계정 B로 로그인해 계정 A 항목이 안 보이는지 재확인

## 그 외 대기
- 별도 트랙: Meshy에서 model.glb 다운로드 (Phase 3 전까지)
- Sentry 연동 [미해결, 이월]
- **참고**: `docs/plans/2026-07-20-1st_Fut_list.md` — 에이전트가 만든 파일이 아님(사용자가 직접
  추가한 것으로 보임). 대규모 기능 백로그/향후 Phase 프롬프트로 보이며 손대지 않고 그대로 둠.
  다음 세션에서 이 파일로 작업을 시작하려면 사용자 확인 필요.
