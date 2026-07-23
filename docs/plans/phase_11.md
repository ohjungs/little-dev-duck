# Phase 11 — DB 뷰 (표/보드)

착수: 2026-07-23 `/loop` 자율(사용자 "Phase 완료 시 다음 Phase 스코프해 Phase 17까지 진행" 지시).
로드맵상 Phase 10(AI 2단계) 코드 완료 후 다음 순번. phase-mapping-proposal에서 "DB 뷰(표/보드)"로
정의됐으나 항목 표는 비어 있어(신규 배정 없음) 본 문서에서 Task를 처음 분해한다.

## 제품 정의

노션식 데이터베이스: 페이지 집합을 표(table)·보드(board=kanban) 뷰로 본다. 각 행은 타입이 있는
속성(열)을 가진다. LDD의 기존 페이지 계층(Phase 9) 위에 바로 얹는다.

## 설계 판단 (ponytail — 새 테이블 없음)

데이터베이스를 **별도 엔티티로 만들지 않고 `pages`에 얹는다**:
- 데이터베이스 = `db_schema jsonb`가 설정된 페이지(열 정의 + 뷰 목록).
- 행 = 그 데이터베이스 페이지의 **자식 페이지**(이미 `parent_id` 존재 — 재사용).
- 행의 속성값 = `row_props jsonb`(propId -> 값). 일반 페이지는 `db_schema=null`, `row_props={}`.

근거: 행이 곧 페이지이므로 클릭하면 그대로 문서로 열리고(노션 동일 UX), 트리·검색·휴지통·RAG
인프라(Phase 9)를 전부 공짜로 물려받는다. 별도 `databases`/`rows`/`properties` 테이블은 조인·RLS·
cascade를 새로 설계해야 해 과설계.

## 속성 타입 (최소 집합)

`text` / `number` / `select` / `checkbox` / `date`. select만 `options`(선택지)를 가진다.
나머지는 후속(관계형 relation, rollup, 수식 등 — YAGNI, 필요해지면 추가).

## 뷰 타입

`table`(행×열 그리드, 셀 인라인 편집) / `board`(select 속성으로 그룹된 kanban, 카드 드래그 이동).

## Task 분해

- [ ] T1 계약 잠금(직렬): core `database-view.ts`(propertyDef/viewDef/dbSchema/rowProps 스키마 +
      순수함수 `createDefaultDbSchema`/`coerceRowPropValue`/`groupRowsByProperty`) + 마이그레이션
      `20260723110000_pages_db_view`(pages에 db_schema/row_props 컬럼 add + rollback) + api pages.ts
      확장(pageSchema에 dbSchema/rowProps, `listChildPages`, updatePage/createPage에 두 필드). STDD.
- [ ] T2 표 뷰: `/pages/[id]`가 db_schema 있으면 DatabaseView 렌더. 뷰 탭 + 표(열 헤더=속성, 행=자식
      페이지, 셀 인라인 편집, "+ 새 행", 행 제목 클릭 시 그 페이지로 이동) + "데이터베이스로 전환" 액션.
- [ ] T3 보드 뷰: select 속성으로 그룹된 열 + 카드 + HTML5 드래그로 열 간 이동(라이브러리 없음) +
      열별 "+ 새 행"(그 그룹값 프리셋).
- [x] T4 속성 편집: 열 추가/이름변경/타입변경/삭제 + select 옵션 추가·제거(`DbPropertyMenu`). 최소 UI.
- [x] T5 code+security 리뷰(병렬) + 수정: CRITICAL 0, HIGH 3 전부 수정(쓰기검증/읽기강등, 낙관적
      업데이트 에러·롤백, 타입변경 groupBy 해제), MEDIUM/LOW 수정 또는 알려진 제약 문서화. 회귀 테스트 추가.
      gstack /qa 실기는 OAuth 로그인 필요라 사용자 몫으로 이월.

## 안전·계약 메모

- 계약 변경(pageSchema에 필드 2개 추가)은 병렬 구간 밖에서 수행 — 기본값(`dbSchema=null`,
  `rowProps={}`)을 줘 기존 페이지·테스트가 그대로 파싱되도록 하위호환 유지.
- 마이그레이션은 `db push` 필요(사용자). DDL이라 안전 규칙상 사용자 적용 — 코드는 컬럼 없이도
  빌드/테스트 가능(select "*"가 있으면 자동 포함, 없으면 default).
- row_props 값은 현재 plain_text/RAG 인덱싱 대상이 아님(후속 — 검색 수요 생기면 확장).
