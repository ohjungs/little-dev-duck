# DECISIONS.md — 확정 의사결정 대장

2026-07-19 설계 세션에서 사고 게이트를 통과해 확정된 결정 전체.
변경하려면 사고 게이트를 재통과하고 이 문서를 갱신한다.

## 1. 플랫폼과 배포

| 항목 | 결정 | 기각 옵션과 사유 |
|---|---|---|
| 형태 | 모노레포: 웹앱 + Tauri 데스크톱 위젯, RN은 최종 단계 | 단일 플랫폼 - 위젯과 도메인 접속 요구를 동시에 못 채움 |
| 데스크톱 셸 | Tauri 2 | Electron - 상시 위젯 용도에 용량과 메모리 과다 |
| 프론트 | Next.js + TypeScript | Vite React - Vercel CI/CD 일체감에서 열세. Svelte - BlockNote와 R3F가 React 생태계 |
| 배포 | Vercel(웹, push=배포) + GitHub Actions(lint/test, Tauri Release) | - |
| 저장소 | 새 공개 모노레포 little-dev-duck 1개 | 비공개 - Actions 무료 사용량과 포트폴리오 공개성에서 열세 |
| 도메인 | 시작은 *.vercel.app, 추후 littledevduck.dev 계열 구입(유일한 유료 항목) | - |
| 모바일 | React Native 별도 개발. UI 비공유, core/api/ai 공유 | Capacitor - 사용자가 RN 명시 선택. PWA만 - 스토어 출시 요구 미충족 |

## 2. 데이터와 인증

| 항목 | 결정 |
|---|---|
| 저장/동기화 | Supabase 무료 티어. 위젯과 웹이 같은 데이터 공유 |
| 인증 | Supabase Auth, Google + GitHub 로그인. 로그인 권한과 연동 권한 분리(연동은 설정에서 별도 OAuth) |
| 보안 | 전 테이블 user_id 기반 RLS. 공개 페이지는 is_public 예외 |
| 마이그레이션 | down 스크립트 필수 (Supabase는 Vercel처럼 롤백이 쉽지 않음) |
| 무료 티어 리스크 | 장기 미사용 시 일시정지 - 주기 ping 또는 수용 (수용으로 결정, 필요 시 재론) |

## 3. AI (오리 비서)

| 항목 | 결정 |
|---|---|
| LLM | Gemini API 무료 티어. 키는 서버 env, Next.js API Route 프록시 경유 |
| 사용 가드 | AI 기능은 로그인한 본인 계정에서만 활성화 (공개 데모 방문자의 쿼터 소모 차단) |
| RAG | Supabase pgvector + Gemini 임베딩. 페이지/메모/할일/커밋을 저장 시 임베딩 |
| 학습 | 파인튜닝 없음(제외). 메모리 테이블 축적 + 데이터 증가에 따른 RAG 품질 향상으로 구현 |
| 에이전트 액션 | AI 액션 중심. 어댑터 프레임워크로 Figma, Gamma, Google Calendar/Drive, GitHub, Notion(+가져오기), Gmail. 1개 검증 후 확장 |
| Gmail 비서 | 1시간 폴링, 분류/라벨 자동, 휴지통 이동만 승인, 중요도는 AI + 사용자 규칙. 영구삭제 설계상 금지. 공개 배포 시 restricted scope 심사(CASA) 필요 - 본인 설정 옵션으로 격리 |
| BYOK | 차기 옵션 |

## 4. 오리 마스코트

| 항목 | 결정 |
|---|---|
| 렌더링 | three.js + react-three-fiber, GLB. 캐릭터 정의는 ducky-mascot 저장소 CHARACTER.md |
| 팔레트 | 몸통 #F6EFDD, 음영 #E3D3B9, 부리/발 #A99C65, 외곽선/안경 #352116 — `packages/mascot`의
  Duck 렌더링 색상은 CHARACTER.md 고정값이라 임의 변경 금지, 이 규칙은 유지된다 |
| 인터랙션 계단 | 클릭 반응 - 상태 반응 - 자율 행동 순으로 구현 |
| 트리거 | 할일 상태, 시간대, 방치(노트북 코딩 모션), 커밋 활동, 접속 인사(last_seen_at으로 오랜만 감지), 마우스 반응 |
| 말 | 말풍선 + CC0 효과음(Kenney, freesound). TTS는 차기(Web Speech) |
| 데스크톱 형태 | 카드형 패널과 바탕화면 활보(투명창) 모드 전환. Tauri 투명/클릭통과 창 사용 |
| 게임화 | XP 원천: 할일 완료, 커밋, 습관 스트릭, 뽀모도로. 코스튬은 레벨 해금 + 먹이(재화) 구매 혼합 |
| 리스크 | [가정] model.glb의 리깅/morph target 유무 미확인. 없으면 얼굴 텍스처 스왑 또는 Blender 리깅으로 대체 |
| 사이트 테마 accent (2026-07-20 변경) | `packages/ui`의 accent 토큰을 올리브(#A99C65)에서 앤트로픽
  스타일 오렌지(#D97757)로 변경(사용자 요청: "쩅한 주황색... 앤트로픽 색상처럼"). bg/surface/text는
  기존 유지 — WCAG AA 대비 테스트(`tokens.test.ts`)로 재검증 통과. **오리 자체 렌더링 색상과는
  별개**이며 위 팔레트 행(CHARACTER.md 고정값)은 변경하지 않는다 — 사이트 UI 크롬(버튼/카드/잔디
  위젯 등)과 오리 3D 모델 색상이 이제 의도적으로 분리됨 |

## 5. 워크스페이스 (앱 모드)

포함: 블록 에디터(BlockNote), 코드 하이라이팅, PDF/HTML 임베드, 버전 히스토리, 휴지통/복원,
전역 검색+즐겨찾기, 템플릿, 백링크, 댓글+멘션, 파일 업로드(Storage), md/csv/pdf 가져오기/내보내기,
웹 공개 공유(/p/[id], 읽기 전용), DB 뷰는 표/보드 + 필터/정렬부터.

차기: 캘린더/타임라인/갤러리/리스트 뷰, 수식/관계/롤업, 동기화 블록, 공개 API, 웹클리퍼, 오프라인/PWA.

제외: 실시간 공동편집 - CRDT 인프라가 개인 제품 가치 대비 과대.

## 6. 위젯과 생산성 모듈

포함: 투두(오늘/날짜별/빈 상태/에러/로딩), 메모, 커밋 잔디(GitHub + Claude Code, Tauri 내장 수집기),
타임라인, 통계 대시보드, 뽀모도로(오리 동반 집중), 습관 트래커(체크 + 잔디 뷰), 캘린더 + D-day,
알림 4채널(말풍선, Tauri 네이티브, Web Push, Resend 이메일 주간 리포트).

Claude Code 수집기: Rust 사이드가 로컬 로그 파싱, 일별 집계만 업로드(원문은 로컬 유지).
[가정] 로그 경로/포맷은 Phase 착수 시 실측.

## 7. 품질/상용 요소

라이트/다크(오리 팔레트 기반), ko 기본 + en i18n, 랜딩 페이지, 온보딩 투어,
Sentry + Vercel Analytics 무료 티어, 접근성 기본 준수.

## 8. 개발 방법론

STDD + ponytail(full) + gstack + PDCA 에이전트 팀 + Review-Learning Loop(2단계 도입).
병렬 규칙과 모델 운용은 CLAUDE.md 3장. 코드 리뷰 기준은 gstack /review + /ponytail-review (사용자 룰 11 충족).

## 9. 미해결/미검증 (해당 Phase 착수 시 실측)

1. model.glb 미다운로드 (Meshy 계정). 리깅/morph target 유무가 표정 구현 경로 결정 - Phase 3
2. Claude Code 로그 경로/포맷 - Phase 5
3. ~~GitHub GraphQL contributions 스코프 세부 - Phase 4~~ -> 해소(2026-07-20): 공개 프로필
   데이터라 OAuth 스코프 불필요, scope 없는 서버 공용 `GITHUB_TOKEN`으로 조회. 상세는
   docs/plans/phase_04.md "착수 전 확인" 참조.
4. Figma/Gamma/Notion MCP 인증 방식 - Phase 10
5. 1시간 크론의 무료 실행 경로 (GitHub Actions schedule vs Supabase cron) - Phase 10
6. 로컬 스케줄러 + headless Claude Code 일일 리뷰 배치 동작 - Phase 4~5
7. 게임 밸런스 수치 (XP/먹이 획득량, 레벨 곡선) - Phase 7
8. Vercel 무료 티어 크론 주기 제약 실측 - Phase 10
9. Sentry 연동 - 계정 미생성으로 Phase 1 T6에서 보류. 절차는 docs/setup/deploy-setup.md 5절
10. 로그인 접근 제어(2026-07-20 사용자 결정) - 현재는 Google/GitHub OAuth만 통과하면 누구나
    로그인·프로필 생성이 가능한 상태(RLS로 데이터는 격리되지만 접근 자체는 열려 있음). 이 앱은
    1인 개인 비서 용도라 향후 **관리자 승인 워크플로**를 도입한다 - 신규 가입자는 승인 대기
    상태로 생성되고, 관리자(본인)가 승인 페이지에서 개별 승인해야 로그인이 완료된다. OTP는
    기각(OAuth보다 강한 인증 수단일 뿐 "허용된 사람만 통과"라는 authorization 문제를 풀지
    못함 - 누구나 자기 이메일로 OTP를 받을 수 있음). 착수 시점은 Phase 8(AI 1단계) 근처 -
    지금 당장 처리하지 않기로 사용자가 명시적으로 결정(순서 준수 우선).
