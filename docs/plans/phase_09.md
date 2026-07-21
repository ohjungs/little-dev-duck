# Phase 9 — 워크스페이스 코어 (블록 에디터) — 초안

작성 2026-07-22 새벽, Phase 8 종료(코드·배포) 직후 `/loop /next-step`의 "다음 Phase 계획 초안" 단계로 생성.
**이 문서는 초안이다. T1 이하 구현 착수는 아래 "착수 조건"을 전부 통과한 뒤 별도 승인이 필요하다.**
로드맵 정의(ARCHITECTURE.md 6절): Phase 9 = 블록 에디터. **DECISIONS.md 5절에서 "블록 에디터"→"워크스페이스
코어"로 범위 재정의**(앱 셸+페이지 계층+에디터+검색+내보내기+파일 업로드+Quick Capture 연결). 근거:
DECISIONS 5절(포함 목록·회수 배정), phase-mapping-proposal 2절 Phase 9(5건), notion-gap-analysis 2026-07-21.

## 이 Phase의 실질 범위

CLAUDE.md 제품 정의의 "앱 모드(노션급 블록 에디터)"를 실체화한다. 지금까지(Phase 1~8)는 위젯 모드
(오리+투두+메모+잔디+게임화+생산성+AI 대화)였고, Phase 9가 그 옆에 **페이지 기반 문서 작업 공간**을
연다. 저장은 blocks 테이블이 아니라 **`pages.content jsonb`(BlockNote 문서 통짜 저장)**(ARCHITECTURE 154행,
2026-07-21 검토). 이 `pages` 스키마 확정이 **Phase 8이 T0-7로 이월한 "pages jsonb" 게이트의 실체**다.

## 착수 조건 — T0 (직렬, 구현 전 필수)

1. **Phase 8 실호출 검증 통과**(사용자) — `supabase db push` + `GEMINI_API_KEY` + RAG 답변 확인. Phase 9의
   페이지도 RAG 인덱싱 대상이 되므로(아래 T7) AI가 실제 동작하는 상태가 선행돼야 검증이 의미 있다.
2. **페이지 저장 스키마 확정**(= Phase 8 pages-jsonb 게이트 해소) — `pages`(id, user_id, parent_id(계층),
   title, content jsonb(BlockNote 문서), icon, is_public, is_trashed, trashed_at, created_at, updated_at).
   blocks 테이블 대신 jsonb 통짜(ARCHITECTURE 154행). jsonb 크기/성능 한계는 게이트에서 실측.
3. **BlockNote 통합 방식** — BlockNote(React, MPL 오픈소스) 버전·번들 크기·`next/dynamic ssr:false` 로딩,
   코드 블록 신택스 하이라이팅 방식 확정. Phase 3 마스코트(r3f dynamic)와 같은 클라이언트 전용 로딩 패턴.
4. **페이지 텍스트 추출 순수함수** — BlockNote content jsonb → plain text(`extractPlainText`, core). RAG
   인덱싱(T7) + 전역 검색(T4) 공용. 블록 타입별 텍스트 추출 규칙을 계약으로 고정.
5. **soft delete 정책** — is_trashed + trashed_at, 30일 보관(phase-mapping MUST). 30일 경과 정리는 무료
   원칙상 자동 스케줄러 대신 정리 함수/수동 또는 접속 시 정리(게이트 판정).
6. **앱 셸·라우팅** — 위젯 모드(현 홈 `/`) ↔ 앱 모드(에디터 `/app/[pageId]`) 전환 UX. 기존 홈 대시보드를
   깨지 않고 진입점만 추가(page.tsx 재설계는 최소화).
7. **파일 업로드 경계** — Supabase Storage 버킷 + RLS(본인 경로만) + 이미지 블록. 무료 스토리지 한도 실측.

**게이트 규칙**: 위 7항 확정 + Phase 8 검증 후 계약 잠금 → T1 착수.

## 계약 잠금 대상 (병렬 착수 전 확정, CLAUDE.md 3-3)

- **`packages/core`**: `pageSchema`(zod, content는 jsonb=`z.unknown()`/느슨한 스키마), `extractPlainText`
  (BlockNote 문서→텍스트, 순수·테스트), 검색 결과 타입, 버전 스냅샷 타입.
- **DB 마이그레이션(down 동반)**: `pages`(계층 parent_id 자기참조, RLS `user_id=auth.uid()`, is_public 예외
  는 Phase 12 공개공유까지 select만 확장), `page_versions`(스냅샷: page_id, content jsonb, created_at),
  Storage 버킷 정책. 전역 검색용 `pages.title/plain_text` GIN(pg_trgm 또는 tsvector) 인덱스.
- **`packages/api`**: pages CRUD(list/tree/get/create/update/softDelete/restore/purge) + 버전 스냅샷
  (저장 시 or 수동) + 검색(ilike/full-text) + 파일 업로드 헬퍼(Storage signed upload).
- **`packages/ai`(Phase 8 확장 — 계약 변경, 병렬 밖)**: `embeddingSourceSchema`에 `"page"` 추가 +
  페이지 저장 시 `reindexSource('page', pageId, extractPlainText(content))` 배선. Phase 8 T0-4/T0-7 해소.
- **`packages/ui`**: 에디터 셸/툴바, 사이드바 페이지 트리, Cmd+K 커맨드 팔레트, 휴지통 뷰(gap-analysis
  6.2절 Dialog 도입 지점).

## Task 초안 (착수 조건 통과 + 승인 후 확정)

- **T1 페이지 기반**: `pages` 테이블 + CRUD + 계층 사이드바(트리) + 앱 셸/`/app/[pageId]` 라우팅.
- **T2 BlockNote 에디터**: 블록 편집 + 코드 하이라이팅 + 자동 저장(debounce)→content jsonb. MVP 경계.
- **T3 파일 업로드 + 이미지 블록**: Storage 버킷 연동(파일 업로드=이미지 블록과 동시, DECISIONS 5절).
- **T4 전역 검색 Cmd+K**: 페이지 제목/텍스트 검색 + 즐겨찾기(정확 검색 — RAG 의미검색과 별개).
- **T5 휴지통/복원 + 버전 히스토리**: soft delete(30일) + 스냅샷 방식 버전(DECISIONS 5절 회수 배정).
- **T6 내보내기 + 백업 + 템플릿**: Markdown 내보내기 + 백업 주 1회 + 내장 템플릿 프리셋(Phase 9 말미).
- **T7 RAG 페이지 인덱싱 연결**: `extractPlainText`→저장 시 reindex(`source_type: "page"`) + 백필 확장.
  Phase 8 대화 오리가 페이지 내용까지 답하게 됨(Phase 8 이월분 완성).
- **T8 검증**: 에디터 저장/복원, 검색 정확도, soft delete 30일, 페이지 RAG 답변, Storage RLS.

## 하지 않는 것 (현재 판단, 착수 게이트에서 재확인)

- **실시간 공동편집(CRDT)** — DECISIONS 5절 제외(1인 제품 대비 과대).
- **웹 공개 공유 `/p/[id]`** — Phase 12(공개 공유+발행 필터)로. Phase 9는 비공개 에디터까지.
- **백링크** — DECISIONS 5절 회수 배정 = Phase 11.
- **댓글+멘션** — 보류(1인 제품 셀프 코멘트 가치 낮음, "오리 인라인 대화"로 재해석 안을 Phase 10 게이트).
- **DB 뷰(표/보드/필터)** — Phase 11.
- **캘린더/타임라인/갤러리 뷰, 수식/관계/롤업, 동기화 블록, 공개 API, 웹클리퍼, 오프라인/PWA** — 차기.

## 규모 주의

Phase 9(워크스페이스 코어)는 **로드맵 최대 규모**다(에디터+페이지 계층+검색+휴지통+버전+업로드+내보내기+
템플릿+RAG 연결). 착수 게이트에서 **분할 승인 강력 권고** — (a) T1(페이지 기반)+T2(에디터)를 MVP로 먼저
닫고 실사용 검증 후, (b) T3~T7을 순차 또는 병렬(패키지 경계)로. Phase 7(게임화+생산성 4축)보다 크다.

## 미검증·확인 필요 (보고 말미)

- [추정] BlockNote 최신 버전·번들 크기·무료(MPL) 조건, `pages.content jsonb` 크기/쿼리 성능 한계,
  Supabase Storage 무료 한도는 게이트에서 실측 확인 필요.
- [가정] `pages` 스키마가 Phase 8 pages-jsonb 게이트의 해소이자 RAG "page" 소스의 전제 — Phase 8
  `embeddingSourceSchema` 확장은 계약 변경이므로 병렬 구간 밖에서만(CLAUDE.md 3-3).
- [가정] 앱 셸 추가는 기존 위젯 홈(page.tsx)을 유지한 채 진입점만 더하는 방향 — 전면 재설계(홈을
  워크스페이스로 대체)는 별도 결정 사안(notion-gap-analysis Phase 9 홈 재설계 관측 2774와 정합 필요).
