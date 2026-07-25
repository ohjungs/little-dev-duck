# Phase 18 — 공유·성장 루프 (마케팅팀 주도 SCOPE)

착수 근거: `/loop-eng` SCOPE(5장). Phase 1~17 + 감사 22항목 + 픽셀오피스 A~I 로드맵이 코드 소진되어,
marketing-skills(marketing-ideas #87/#15/#93, AARRR 격차) + 내부 교차검증으로 **신규 로드맵을 발굴**.
교차검증 모드: internal-panel(외부 사용자 데이터 없음 — customer-research는 실사용자 리뷰 부재로 제한적,
AARRR 격차 분석 + product-led-growth 아이디어 라이브러리 기반). 정지 없이 다음 로드맵 생성.

## 방향 전환 (중복 회피)

기존 로드맵은 "노션 기능 패리티"였고 이미 소진(FEATURES.md 146항 + notion-gap 전수 대조 완료).
Phase 18은 **패리티가 아니라 제품의 고유 강점(공개 페이지 공유 · 오리 컴패니언 · 픽셀오피스)을
성장 루프로 전환**한다. 제약 준수: **무료 원칙**(새 유료 인프라 0), 단일 사용자 워크스페이스 모델,
ponytail 재사용 우선, STDD.

## AARRR 격차 → 착수 가능한 것만

- Acquisition: 공개 페이지가 있으나 공유 링크가 SNS에서 밋밋(OG 이미지 없음) + 제품 노출 배지 없음 + SEO 표면 없음 → T1, T5
- Activation: 온보딩(T1 Phase13) 있으나 빈 화면에서 "다음에 뭘"이 없음 + 시작 템플릿 없음 → T2, T3
- Retention: 오리·XP·스트릭 있으나 주기적 복귀 훅(주간 회고 루프) 없음 → T4
- Referral: 단일 사용자 모델이라 초대 기반 바이럴은 대형 인프라 필요 → **탈락**(무료원칙·YAGNI). 대체로 T1 powered-by 배지가 소극적 바이럴.
- Revenue: 무료 원칙상 수익화 제외 → **탈락**.

## 슬라이스 순서 (self-contained·저비용 우선 = ponytail)

### T1 공개 페이지 바이럴 루프 (Acquisition/Referral, idea #87 powered-by)
공유된 `/p/[slug]` 공개 페이지가 곧 제품 광고가 되게 한다.
- **수용 기준**:
  - 공개 페이지 하단에 은근한 "Little Dev Duck으로 만들었습니다" 배지(작성자 워크스페이스로 유도하지 않고 `/welcome`로). 로그인 사용자 본인 뷰에는 숨김.
  - 공유 링크 OG 이미지 자동 생성: `/p/[slug]/opengraph-image`(Next `ImageResponse`, 추가 의존 없음) — 페이지 제목 + 오리 로고 + 브랜드. Twitter/카톡/슬랙에서 카드로 보이게 `generateMetadata`에 og/twitter 태그.
  - 비공개/미공개 slug는 OG 라우트가 404(열거 방지, 기존 get_public_page 계약 재사용).
- **의존 계약**: 기존 `getPublicPage` RPC 재사용. 스키마 변경 없음. 새 라우트 파일만.

### T2 시작 템플릿 갤러리 (Activation)
빈 워크스페이스의 "무엇부터?"를 1클릭으로 해소.
- **수용 기준**:
  - 내장 템플릿 5종: 일일 저널 / 프로젝트 트래커(DB 뷰) / 독서 목록(DB 뷰) / 주간 회고 / 스탠드업. 각 템플릿은 순수 데이터(제목·아이콘·BlockNote 블록·필요 시 dbSchema).
  - "템플릿에서 시작" → 기존 `createPage`(+dbSchema/rowProps) 재사용으로 페이지 생성. 새 서버 계약 없음.
  - 온보딩(Phase13 T1)과 빈 상태(T3)에서 진입점 노출.
- **의존 계약**: core에 `page-templates.ts`(순수 템플릿 정의 + `templateToPageInput` 매퍼, STDD). api 변경 없음(createPage 재사용).

### T3 빈 상태 코치 (Activation)
각 뷰의 빈 화면이 막다른 길이 아니라 다음 행동을 안내.
- **수용 기준**: 투두·페이지·뉴스·DB 뷰의 빈 상태에 1줄 안내 + 주 CTA(예: 뉴스=피드 추가, 페이지=템플릿 갤러리). 순수 web 컴포넌트 `EmptyState`(재사용). 스키마·계약 변경 0.
- **의존 계약**: 없음. 기존 뷰에 컴포넌트 삽입만.

### T4 오리 주간 다이제스트 (Retention loop)
오리가 주 1회 지난 주를 요약한 페이지를 자동 생성해 복귀 훅을 만든다.
- **수용 기준**:
  - 주간 경계(예: 월요일)에서 아직 이번 주 다이제스트가 없으면 오리가 지난 주 활동(완료 투두·습관·XP·읽은 기사)을 요약한 페이지 생성. 기존 `dashboard.ts`(insights 집계) + 스탠드업 생성기(bedd1e5) 재사용, Gemini 요약은 쿼터 가드 안에서 선택적.
  - 방해금지(isQuietHour)·일일 알림 상한(nextDailyCount) 준수 후 알림(기존 notify) 1건.
  - 중복 생성 방지(주차 키 localStorage). 순수 트리거 로직은 core `weekly-digest.ts`로 분리 + STDD(주 경계·중복 판정).
- **의존 계약**: core `weekly-digest.ts`(순수: 주차 키·트리거 판정, tests). 기존 집계/생성/알림 재사용, 새 마이그레이션 없음.

### T5 발견성/SEO 표면 (Acquisition, 저비용)
- **수용 기준**: `/welcome`·`/p/[slug]` 메타데이터(title/description/canonical) + `sitemap.ts`(공개 페이지 slug + /welcome) + `robots.ts`. 비공개 경로 noindex. Next metadata API만(의존 0).
- **의존 계약**: 없음(공개 slug 목록은 열거 방지 위해 sitemap에서도 신중히 — 사용자 opt-in 공개분만, 필요 시 T1 범위로 축소).

## 탈락 / 이월 (교차검증)

- ~~초대·멀티유저 워크스페이스 referral(#93)~~ — 단일 사용자 모델, 협업/권한 인프라 대공사 → 탈락(무료원칙·YAGNI).
- ~~인앱 업셀·수익화(#91)~~ — 무료 원칙 위배 → 탈락.
- [이월] T5 sitemap의 공개 slug 노출 범위는 프라이버시 재검토 후 확정(기본은 배지·OG까지만, sitemap은 /welcome 위주).

## 검증 정책

각 Task: STDD(core 순수함수 우선 RED→GREEN) + 전 패키지 tsc + 변경 lint + 유닛/통합 GREEN.
UI가 붙는 T1~T4는 `/loop-eng` 4-1대로 Playwright로 항목별 스크린샷 저장 + 실기 육안 검증은 8-1 보류 후 진행.

## 구현 현황

- [x] **T1 공개 페이지 바이럴 루프 (2026-07-25/26, `/loop-eng` SCOPE + `/next-step` 인계)** — 기능 완료.
  - core `public-page-meta.ts`(`publicPageMetaCopy`: 소셜카드 제목·설명 파생, 코드포인트 절단으로 이모지 보존,
    공백 정규화, 상한 70/200). STDD 8 tests(63938e3).
  - web 루트 `opengraph-image.tsx`(next/og 1200x630, 절차적 오리·외부에셋 0, satori 한글폰트 부재라 이미지
    텍스트는 영문·한글 제목은 og:title 메타로) + `/p/[slug]` generateMetadata가 publicPageMetaCopy 재사용
    (브랜드 중복 방지·미공개 noindex) + twitter summary_large_image(01f465d).
  - **powered-by 배지·본인 숨김**: 배지 자체는 기존 `PublicPageView` 푸터("Little Dev Duck로 만들었어요"
    → /welcome) + 헤더 브랜드로 **이미 충족**(a98e2b8, Phase 12). "로그인 본인 뷰 숨김"은 **의도적 미구현** —
    배지가 이미 은근한 푸터 링크라 본인이 봐도 무해한데, 숨기려면 열거방지 RPC(get_public_page)가 일부러
    빼둔 소유자 식별을 공개 라우트에서 되살려야 함. 작은 편의 대비 보안 표면·복잡도 증가라 ponytail로 컷.
  - 검증: core 385 tests(+8)·tsc / web tsc·build / 변경 lint GREEN. 배포됨. 실기 육안(실제 SNS 카드 미리보기)은 8-1 보류(사용자).
- [ ] T2~T5: 미착수.

> **주의(동시성)**: 이 Phase는 두 세션(SCOPE 생성 세션 + `/next-step` 인계 세션)이 같은 워킹 디렉터리에서
> 겹쳐 진행됨. 9-1/9-4 위반 위험 — 하나의 루프만 운용 권장.

- [x] **T2 시작 템플릿 갤러리 (2026-07-26, `/loop-eng`)** — 기능 완료, 화면 육안 미검증(8-1 보류).
  - **계획 수정 사유(인벤토리)**: 계획은 "core에 `page-templates.ts` 신설"이었으나, 착수 후
    `apps/web/src/lib/pageTemplates.ts`에 템플릿 7종이 **이미 존재**함을 발견(회의록·일일 노트·할 일·
    주간 회고·프로젝트 계획·개발 노트·빈 페이지). core 신설분은 재구현이라 폐기하고 기존 모듈을 확장.
    계획서의 5종 중 일일 저널·주간 회고·스탠드업은 기존 템플릿과 실질 중복이라 신설하지 않았다.
  - **실제로 없던 것만 추가**: ① DB 템플릿 2종(프로젝트 트래커·독서 목록) — 기존 시스템엔 dbSchema
    개념이 없었다 ② 날짜 제목(`templateTitle`, day/week) ③ 빈 상태 노출(CTA).
  - **계약 확장**: `createPage`에 `dbSchema` 추가(rowProps와 같은 zod 선검증). 2단계 생성 시 중간
    실패로 열 없는 페이지가 남는 걸 피한다. 부수 효과로 데이터베이스 페이지 **복제 시 스키마 유실
    버그** 해소(행=자식 페이지는 여전히 미복사 — 알려진 제약).
  - **공용화**: 로컬 날짜 포맷이 dashboard.ts·notify.ts·today.ts에 중복돼 있어 core `date-util`에
    `toLocalDateString`·`startOfWeek` 추가(+13 tests). web의 기존 복제 2곳 정리는 후속.
  - 검증: core 403 / api 248 / web 127 tests · 전 패키지 tsc · lint · next build GREEN.
