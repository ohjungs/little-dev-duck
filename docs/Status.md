# Status.md — 현재 Phase 진행 현황

> ## ⏭ 2026-07-26 `/loop-eng` — 뉴스 요약이 비던 문제 + 린트 캐시 구멍
> 지난 사이클에 이어 추천 피드를 실제로 파싱해 **뽑힌 값의 품질**을 봤다(개수만 봐선 안 보인다).
> - **[결함] GeekNews만 요약이 30/30 전부 비어 있었다.** GeekNews(Atom)는 `<content>`를 쓰는데
>   파서가 `description`/`summary`만 봤다. 요약이 없으면 화면 미리보기가 비고, **Gemini 3줄
>   요약도 제목만으로** 만들어진다(요약 품질이 통째로 떨어진다). → `content:encoded`·`content`를
>   대체로 추가. 규격상 발췌(summary/description)가 우선이고 전문(content)은 없을 때만 쓴다.
> - **[결함] 이중 인코딩된 엔티티가 화면에 그대로 보였다** — DEV Community 요약에 `—&gt;`.
>   피드가 HTML을 이스케이프하고 XML로 또 이스케이프해서(`--&amp;gt;`) 한 번만 풀면 남는다.
>   태그를 걷어낸 뒤 한 번 더 푼다(걷어낸 뒤 남은 엔티티는 HTML 본문의 것이다).
> - **고친 파서를 실제 피드에 다시 통과시켜 확인**했다: GeekNews 요약 0/30 → **30/30**, 9개 피드
>   전부 문제 표시 없음.
> - **[내 검증의 구멍] 지난 사이클 "lint GREEN" 보고가 실제보다 약했다.** 루트 eslint 설정을
>   바꿔도 **패키지별 lint 캐시가 살아 있어** 새 규칙이 안 돌고 통과로 보고됐다. 이번에 캐시가
>   무효화되면서 core 테스트의 위반이 그제서야 드러났다.
>   → `turbo.json`에 `globalDependencies`(eslint 설정·tsconfig)를 넣어 루트 설정이 바뀌면
>     모든 패키지 캐시가 무효화되게 했다. 규칙을 추가하고도 안 돌면 규칙이 없는 것과 같다.
> - 검증: core 209 tests(+7) / turbo test·lint·build 18/18 GREEN(**캐시 0건에서 재실행 확인**).


> ## ⏭ 2026-07-26 `/loop-eng` — 추천 피드 실측 검증에서 나온 결함
> 추천 피드 9개를 **실제로 받아 우리 파서에 넣어** 봤다(RSS는 공개라 로그인 없이 검증 가능).
> Phase 19에서 "9개 전부 200 + RSS 확인"이라고 했지만 그건 curl 응답만 본 것이고,
> **파서가 실제로 항목을 뽑는지는 확인된 적이 없었다.**
> - **9개 전부 정상 파싱**(GeekNews 50 · HN 20 · DEV 12 · Google AI 20 · OpenAI 1050 ·
>   GitHub 10 · Vercel 1378 · Meta 9 · Netflix 10). 파서 자체는 문제 없음.
> - **[결함] 두 피드가 전체 아카이브를 통째로 내보낸다** — Vercel 2.9MB/1378건, OpenAI 636KB/1050건.
>   `collectFeed`는 파싱된 항목을 **개수 제한 없이 한 건씩 순차 insert**한다. 즉 추천 칩을 한 번
>   누르면 **1378번 왕복**이 돌아 서버리스 실행시간 안에 끝나지 않고 DB도 두들긴다.
>   → 한 번에 50건까지만 저장(정상 피드 최대가 50건이라 잃는 게 없다). RSS는 관례상 최신이
>     앞이므로 **앞에서부터** 자른다 — 뒤에서 자르면 오래된 것만 남는다.
> - **[하드닝] 응답 크기 상한 5MB**(선언된 Content-Length 기준). 피드 URL은 사용자가 자유롭게
>   넣는데 크기를 안 보고 통째로 버퍼링하고 있었다. Content-Length가 없는 응답까지 막으려면
>   스트리밍이 필요해 **정상 피드를 막을 위험이 있어 헤더가 있을 때만** 차단했다(그 이상은 항목
>   상한이 받아낸다) — 완전 차단이 아님을 주석에 명시.
> - **이건 실측이 아니면 못 찾는 부류다.** 단위 테스트는 2건짜리 가짜 XML만 쓰고, curl은 파싱을
>   안 한다. 실제 피드를 실제 파서에 통과시켜야 1378이라는 숫자가 보인다.
> - 검증: api 336 tests(+6) / turbo test·lint·build 18/18 GREEN.
>   네트워크 검증은 일회성으로 돌리고 CI에는 넣지 않았다(외부 피드 상태에 흔들린다).


> ## ⏭ 2026-07-26 `/loop-eng` — 날짜 버그 부류를 린트 규칙으로 차단
> 하루 동안 같은 부류(`toISOString().slice(0,10)` = UTC 날짜)로 **8건**이 터졌고 그중 2건은
> 내가 낸 회귀였다. 고치는 것만으로는 또 들어온다 — **규칙으로 막았다.**
> - `no-restricted-syntax`로 `x.toISOString().slice(...)`를 금지하고, 대안을 오류 메시지에
>   직접 적었다(클라 `todayIso()`/`toLocalDateString`, 서버 `kstDateString`, 타임스탬프→날짜
>   `localDateKey`). CI의 `pnpm lint`에 그대로 실린다.
> - **루트 설정은 next 앱에 자동 적용되지 않는다** — 웹 설정에서 같은 규칙 객체를 import해
>   쓰게 했다(정의는 루트 한 곳). 웹에 위반을 주입해 실제로 걸리는지 확인하고 복구했다.
> - **의도된 예외 1건만 남기고 사유를 적었다**: `coerceTodoDueDate`의 왕복 검사는 방금 UTC로
>   만든 값을 되읽어 대조하는 것이라 UTC가 맞다(달력에 없는 날짜를 걸러내는 게 목적).
>   여러 줄 주석 뒤에 `eslint-disable-next-line`을 두면 코드 줄에 안 붙는다는 것도 확인했다.
> - 부수: 내보내기 파일명 2곳(`ExportDataButton`·`MemoWidget`)이 UTC 날짜를 쓰고 있었다 —
>   KST 새벽에 어제 날짜로 저장되던 것을 `todayIso()`로 고쳤다.
> - 검증: turbo test·lint·build 18/18 GREEN. 규칙 주입 → 오류, 복구 → 통과 확인.


> ## 🔴 2026-07-26 `/loop-eng` — **내가 낸 회귀 수정** (캘린더 날짜가 하루 밀림)
> 직전 사이클에 캘린더 저장을 UTC 자정 → **로컬 자정**으로 바꿨는데(없는 "오전 9:00"을 없애려고),
> **같은 컴포넌트에서 날짜를 UTC로 읽던 두 곳을 안 고쳤다.**
> - D-day 배지: `daysUntil(startAt, todayIso())` — `daysUntil`은 문자열 앞 10자리(=UTC 날짜)를
>   쓰는데 로컬 자정 저장값을 그대로 넘겼다 → KST에서 하루 밀림.
> - 표시 날짜: `event.startAt.slice(0, 10)` → 마찬가지로 전날.
> **고치기 전엔 시각이 틀렸고 고친 뒤엔 날짜가 틀렸다 — 한 사이클 동안 오히려 나빠졌다.**
> - **수정**: 타임스탬프에서 날짜를 뽑는 일을 `lib/localDateKey.ts` 한 곳으로 모았다. 호출부가
>   UTC/로컬을 매번 다시 고르지 않게 한다. 컴포넌트 안의 중복 정의도 제거(core `toLocalDateString`
>   재사용). 6 tests — UTC 슬라이스와 결과가 갈리는 상황 자체를 테스트로 드러냈다.
> - **함께**: `InsightsView`에 남아 있던 같은 부류 5곳도 고쳤다 — `updatedAt.slice(0,10)`(UTC)을
>   `checkedDate`(로컬)와 같은 Set·같은 주간 범위에 섞어 쓰고 있었다(KST 새벽 완료분이 전날로 셌다).
> - 교훈 갱신: **저장 규약을 바꾸면 그 값을 읽는 모든 지점의 목록을 먼저 만들고 시작한다.**
> - 검증: web 225 tests(+6) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ Phase 28 (2026-07-26 `/loop-eng` — 날짜 시간대 버그 전수 스윕)
> 직전 사이클에 고친 캘린더 버그와 **같은 부류가 더 있는지** 전수로 훑어 **5건을 더 찾았다.**
> - **[버그] 통계 주간 경계가 하루 밀려 있었다.** 로컬 자정 월요일을 `toISOString()`으로 잘라
>   **일요일**을 시작일로 쓰고 있었다 — KST에서 "이번 주 vs 지난 주" 비교가 통째로 하루 어긋난
>   창으로 집계됐다.
> - **[버그] 연속 활동(스트릭)이 KST 새벽에 어긋났다.** 오늘을 UTC로 잘라 얻는데 비교 대상
>   `checkedDate`는 로컬 날짜라, 00:00~09:00엔 "오늘" 키가 어제 것이 됐다.
> - **[버그] 습관 히트맵 범위**도 같은 이유로 KST 새벽에 그날 체크를 제외했다.
> - **[버그] 요일별 집계**가 `new Date("YYYY-MM-DD").getDay()` — 날짜만 있는 ISO는 UTC 해석이라
>   음수 오프셋 지역에서 전날 요일이 나온다.
> - **[버그] 스탠드업 날짜**(서버·라우트 2곳): 서버는 UTC로 돌아 KST 새벽엔 어제 날짜로 적혔다.
>   Phase 19에서 습관 체크가 밟았던 함정과 **정확히 같다** — `kstDateString`으로 교체.
> - **저장소는 이미 세 곳에서 제대로 하고 있었다**(`HabitWidget` 수동 포맷, `HabitHeatmap`의
>   `T00:00:00`, Phase 19 `kstDateString`). 통계·스탠드업만 빠져 있었다 — 한 곳을 고칠 때
>   전수로 훑지 않으면 이렇게 남는다.
> - 날짜 계산을 `lib/insightsDates.ts`로 분리해 **Date를 아예 거치지 않게** 했다(문자열·epoch
>   day로만 계산 → 실행 시간대와 무관). 12 tests — 기준 날짜를 주입해 시간대 독립으로 검증.
> - 교훈 기록: `docs/lessons-learned.md` — "Date를 거쳐 날짜 문자열을 만들면 시간대만큼 하루가
>   밀린다(양방향 함정)".
> - 검증: web 219 tests(+12) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ Phase 27 완료 (2026-07-26 `/loop-eng` — 캘린더에 없는 시각이 붙던 버그 + 시각 입력)
> Phase 26의 렌즈("앱이 쓰는 데이터인데 넣을 방법이 없는 것")를 나머지 컬럼에 마저 적용했다.
> - **[버그] 날짜만 고른 일정마다 "오전 9:00"이 붙고 있었다.** 화면은 자정이면 시각을 숨기도록
>   짜여 있는데(`h===0 && m===0 → null`), 위젯이 `new Date("2026-07-28")`로 만들어 저장했다.
>   날짜만 있는 ISO 문자열은 **UTC로 해석**되므로 한국에선 `getHours()`가 9다. 사용자는 시각을
>   고른 적이 없는데 화면이 9시라고 말했다. → 로컬 자정으로 저장하도록 수정.
>   - **오리와도 어긋나 있었다**: 오리의 `coerceEventStart`는 날짜만 받으면 KST 자정으로 만든다.
>     같은 앱에서 일정을 넣는 두 경로가 서로 다른 시각을 저장하고 있었다.
>   - **할 일 마감일과 규약이 다른 건 의도다**: 할 일은 화면이 문자열 `slice(0,10)`으로 오늘을
>     판정해 UTC 자정이 맞고(Phase 23), 캘린더는 `getHours()`로 읽어 로컬 자정이 맞다.
>     읽는 방식이 다르면 저장 규약도 달라야 한다 — 주석으로 남겼다.
> - **[누락] 시작·종료 시각 입력 추가.** `createCalendarEvent`는 `endAt`을 이미 받는데 화면이
>   안 넘기고 있었다(표시는 하고 있었다). 시각은 선택 — 비우면 종전대로 종일 일정이라
>   날짜만 넣던 흐름이 안 깨진다. 종료는 시작을 넣었을 때만 받고, 시작보다 이르면 막는다.
> - **기존 데이터는 건드리지 않았다.** 저장된 일정의 시각 일괄 수정은 되돌리기 어려운 데이터
>   변경이라 하지 않았다 — 새로 만드는 일정부터 바르게 저장된다(manual-verification 19번).
> - 검증: web 207 tests(+14) / turbo test·lint·build 18/18 GREEN.
>   **시간대와 무관하게 성립하도록** 저장 문자열이 아니라 되읽은 로컬 시/분으로 단언했다.
> - **[사용자 결정 필요] 오리 코스튬**: `costume` 컬럼·"먹이(재화)"·DECISIONS.md 확정이 다
>   있는데 **저장만 되고 아무 데서도 읽히지 않는다** — XP를 쌓아 먹이를 모아도 쓸 곳이 없다.
>   오리는 스프라이트 한 장으로 그려져 **새 그림이 필요**하고, 오리 외형은 사용자가 직접 만들어
>   온 영역이라 **자율로 만들지 않았다** — manual-verification 20번.


> ## ⏭ Phase 26 완료 (2026-07-26 `/loop-eng` — 마감일을 화면에서 넣을 수 있게)
> **데이터를 쓰는 기능은 있는데 넣을 방법이 없었다.** 할 일 위젯에는 "오늘 마감" 필터 버튼,
> "오늘 마감인 할 일이 없어요" 빈 상태, 기한 초과 빨간 표시가 **이미 셋 다** 있었다. 그런데
> 사용자가 마감일을 지정할 UI가 없었다 — 즉 **"오늘 마감"을 눌러도 영원히 빈 목록**이었다.
> Phase 23에서 오리가 마감일을 넣게 됐지만, 그건 "오리에게 말해야만 되는 기능"이라는 뜻이다.
> - **새 기능 추가가 아니라 이미 만든 기능을 쓸 수 있게 하는 일**이라 우선했다.
> - **저장 형식 변환을 다시 짜지 않았다.** Phase 23에서 정한 UTC 자정 규약(`coerceTodoDueDate`,
>   8 tests)을 `@ldd/api`에서 내보내 화면이 그대로 쓴다. 화면에서 또 만들면 **규약이 두 곳에서
>   갈라지고**, 그때부터 "오늘 마감" 필터가 조용히 어긋난다 — 이 저장소가 여러 번 겪은 방식이다.
> - **행에 붙였다**(추가 폼 아님). 마감일은 보통 만든 뒤에 정하고 잘못 잡으면 고쳐야 한다.
>   반복 설정이 이미 행에 있어 **같은 자리·같은 규칙**으로 둬야 패턴이 갈리지 않는다.
> - **폭을 아이콘 크기로 고정**했다. `input[type=date]`는 기본 폭이 넓어 안 보여도 모든 행의
>   제목을 좁힌다 — 반복 select에서 이미 겪은 문제라 이번엔 처음부터 막고 e2e로 잠갔다.
> - **표시는 문자열 앞 10자리를 그대로 쓴다.** `toLocaleDateString`에 태우면 시간대에 따라
>   하루가 밀린다(KST에선 멀쩡해 보이고 음수 오프셋 지역에서 깨지는 부류) — 테스트로 잠금.
> - 검증: web 193 tests(+12) / turbo test·lint·build 18/18 GREEN. e2e +4(세션 시 자동 실행).
> - **[사용자 확인]** 육안 검증은 로그인 필요 — manual-verification 18번.


> ## ⏭ 2026-07-26 `/loop-eng` — 직전 검사의 구멍 막기(테이블·RPC 이름)
> 직전 사이클에 만든 컬럼 대조 검사에 **구멍이 있었다**: 마이그레이션에 없는 테이블은 그냥
> 건너뛰도록 짜서, **테이블명 오타는 오히려 조용히 통과**했다. 검사를 만든 다음 사이클에
> 그 검사를 스스로 점검해서 찾았다.
> - **막은 것**: 코드가 참조하는 모든 테이블·RPC 이름이 마이그레이션에 선언돼 있어야 한다.
>   이름이 한 글자 틀리면 그 기능이 런타임에 통째로 죽는데, 가짜 클라이언트 테스트는 이름을
>   아예 검사하지 않는다.
> - **주석을 걸러낸다**: 검사가 **자기 파일의 주석**에 있는 예시(`.from("table")`)를 실제 호출로
>   착각해 없는 위반을 냈다. 없는 위반을 내는 검사는 곧 무시되므로, 주석을 지우고 훑는다
>   (문자열 안의 `//`는 URL이라 건드리지 않는다).
> - **실제로 잡는지 확인**: 진짜 코드에 RPC 오타(`award_xpp`)와 테이블 오타(`memoss`)를 각각
>   넣어 검사가 실패하는 걸 확인하고 복구했다. 가짜 입력 검증만으로 끝내지 않았다.
> - 현재 코드에는 위반 없음(테이블 15종·RPC 4종 전부 선언돼 있음).
> - 검증: api 329 tests(+10) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ 2026-07-26 `/loop-eng` — 컬럼 오타를 CI에서 잡는 검사 (직전 사고 후속)
> 직전 사이클에 배포된 회귀(없는 컬럼을 payload에 실어 할 일 추가가 실패)를 고친 뒤, **같은
> 부류가 더 있는지 실서버 스키마와 전수 대조**했다. 변이 지점 30곳 — 어긋난 곳 없음.
> - **왜 이 검사가 필요한가**: 이 패키지 테스트는 가짜 supabase 클라이언트를 쓴다.
>   **컬럼 이름 오타를 원리적으로 못 잡는다.** 없는 컬럼이 payload에 있으면 PostgREST가 요청
>   전체를 거부하므로, 오타 하나가 그 테이블 쓰기를 통째로 죽인다.
> - **추가한 규칙**: api 코드가 쓰는 모든 컬럼이 마이그레이션에 선언돼 있어야 한다.
>   조건부 스프레드(`...(x ? { col: v } : {})`) 안의 키도 함께 본다 — 거기 숨은 오타도 실제
>   컬럼으로 나간다.
> - **파서를 실제 스키마로 검증했다**: 마이그레이션에서 뽑은 컬럼 목록이 실서버 19개 테이블과
>   **완전히 일치**함을 확인(차이는 대기 중 마이그레이션의 `recurrence` 하나뿐 = 정상).
>   근거 없이 "잘 될 것"으로 두지 않았다.
> - **만들다가 잡은 내 실수**: 깊이와 키를 한 정규식 교대로 잡았더니 **각 객체의 첫 키를 통째로
>   놓쳤다.** 검사가 조용히 약해지는 부류라 특히 위험하다 — 깊이를 위치별로 따로 세도록 고쳤다.
> - **실제로 잡는지 확인**: 가짜 입력 6종 + **실제 코드에 오타를 넣어 실패를 확인**하고 복구했다.
> - 검증: api 319 tests(+5) / turbo test·lint·build 18/18 GREEN.


> ## 🔴 2026-07-26 `/loop-eng` — **배포된 회귀 발견·수정** (할 일 추가가 실패할 수 있던 상태)
> **내가 Phase 20에서 만든 결함이다.** `createTodo`가 `recurrence`를 **항상** insert payload에
> 담도록 바꿔 배포했는데, 그 컬럼을 만드는 마이그레이션은 DDL이라 사용자 확인 대기 중이었다.
> **실서버 `todos`에는 그 컬럼이 없다**(이번에 `information_schema` 조회로 확인).
> PostgREST는 없는 컬럼이 payload에 있으면 요청 전체를 거부하므로 — **반복을 쓰지 않는 평범한
> 할 일 추가까지 실패하는 상태**로 배포돼 있었다.
> - **왜 못 잡았나**: 하위호환을 **읽기 경로만** 챙겼다(`fromRow`·zod 기본값). 테스트는 가짜
>   클라이언트라 실제 스키마를 모르고, 오히려 **"반복이 없으면 null로 저장한다"는 잘못된 동작을
>   고정하는 단언**이 들어 있었다. 그 단언이 이번에 실패해 문제를 드러냈다 — 교체했다.
> - **수정**: 값이 있을 때만 키를 넣는다(`...(x ? { recurrence: x } : {})`). 미사용 시 payload가
>   마이그레이션 이전과 **완전히 동일**해진다. `createTodo`·`restoreTodo` 양쪽. 회귀 테스트 6건.
> - **같은 부류 전수 확인**: 실서버 19개 테이블의 실제 컬럼을 조회해 코드가 쓰는 컬럼과 대조 —
>   어긋난 건 `recurrence` 하나뿐이었다(나머지 마이그레이션은 전부 적용돼 있음).
> - 교훈 기록: `docs/lessons-learned.md` — "미적용 마이그레이션의 컬럼을 insert payload에
>   무조건 실으면 그 테이블 쓰기가 통째로 죽는다". **null을 넣는 것과 키를 빼는 것은 다르다.**
> - 검증: api 314 tests(+6) / turbo test·lint·build 18/18 GREEN.

> ## ⏭ 2026-07-26 `/loop-eng` — 감사 스윕 0건 + 밀린 절차 정리
> **이번 사이클은 새 기능을 만들지 않았다.** 남은 각도를 훑었는데 지적이 나오지 않았고,
> 대신 **프로젝트 규범이 요구하는데 다섯 Phase 동안 빠뜨린 절차**가 있어 그걸 처리했다.
> - **API 표면 감사(신규) — 지적 0건.** 라우트 10개 전수: 인증 게이트·입력 검증·요청 제한.
>   `/api/health`·`/api/ai/agent` 등이 실제로 막히는지 **실서버 curl로 확인**(303).
>   `/api/keepalive`만 공개(의도). 에이전트 라우트는 zod 대신 직접 검증 중이라 정적 스윕이
>   오탐을 냈고, 코드를 열어 타입·길이·요청 제한이 다 있음을 확인했다.
> - **응답 보안 헤더(신규) — 지적 0건.** 실서버 확인: CSP(nonce+strict-dynamic·frame-ancestors
>   none·object-src none)·HSTS·nosniff·Referrer-Policy·Permissions-Policy·X-Frame-Options 완비.
> - **밀린 절차 처리**: CLAUDE.md 4절이 요구하는 **리뷰 스냅샷**(7/22 이후 없었음)과
>   **History.md 이관**(Phase 17에서 멈춰 있었음)을 채웠다.
>   → `docs/reviews/2026-07-26-security-audit.md`(immutable): 무엇을 어떤 방법으로 확인했고,
>     무엇을 **고치지 않기로 했는지와 그 근거**까지 남겼다. 다음 사람이 같은 조사를 반복하지
>     않게 하는 게 목적이다.
>   → History.md에 Phase 18~24 이관.
> - **[사용자 판단 필요]** Status.md가 1142줄이다. 완료 Phase 서술을 History로 옮기면 짧아지지만
>   **문서 삭제는 임의로 하지 않았다** — 정리 여부는 사용자 결정.

> ## ⏭ Phase 24 (2026-07-26 `/loop-eng` — Supabase 어드바이저 실행·대응) · **적용 대기**
> **막혀 있던 점검이 실은 다른 연결로 가능했다.** 세 사이클 동안 "액세스 토큰이 없어 미실행"이라
> 적었는데, 등록된 Supabase 연결이 **두 개**였고 다른 쪽은 인증돼 있었다. 보안·성능 어드바이저를
> 실제로 실행했다. **교훈: "도구가 막혔다"는 결론도 한 경로만 시도한 결과일 수 있다.**
>
> - **[SEC · 우선순위 높음] `award_xp` 권한 결함 발견.** 세 가지가 겹쳐 있었다:
>   ① SECURITY DEFINER라 RLS 우회 ② 본문이 인자 `p_user_id`를 **검증 없이 신뢰**
>   ③ 실제 권한이 `anon=X` — **로그인하지 않아도 임의 사용자의 XP·레벨·먹이를 바꿀 수 있다.**
>   피해 범위는 마스코트 수치지만 인증 없이 남의 행을 쓰는 통로다.
>   - **왜 이렇게 됐나**: 원 마이그레이션은 `REVOKE ALL ... FROM public`으로 막았다고 **의도**했다.
>     그런데 Supabase는 public 스키마 함수에 `anon`·`authenticated` **개별** 권한을 기본 부여하고,
>     의사 롤 `public`을 회수해도 `anon`에 직접 부여된 권한은 남는다. 의도와 실제가 어긋났고
>     확인해 줄 검사가 없었다.
> - **함께 정리**: 트리거 함수 `handle_new_user`·`cleanup_page_embeddings`가 REST로 노출된 것 회수
>   (둘 다 트리거 문맥 밖에선 Postgres가 거부해 **실제 악용 경로는 확인되지 않음** — 그래도 노출
>   이유 없음). `match_embeddings` search_path 지정(이건 SECURITY **INVOKER**라 위험도 낮음).
> - **고치지 않기로 한 것(근거 기록)**: `get_public_page`의 anon 공개는 **Phase 12 T1 설계**다
>   (비로그인 공개 페이지 열람). `vector`·`pg_trgm`의 public 스키마 설치는 Supabase 기본값이고
>   옮기면 타입·인덱스·연산자 참조를 전부 갱신해야 해 **위험 대비 이득 없음**. 유출 비밀번호
>   보호는 OAuth 전용이라 **해당 없음**. **미사용 인덱스 7건은 건드리지 않는다** — 트래픽이 거의
>   없는 DB에서 "미사용"은 아직 안 쓴 것이지 불필요하다는 뜻이 아니다.
> - **성능**: 남은 9개 테이블 RLS 정책을 `(select auth.uid())`로 통일(embeddings·pages는
>   20260724150000에서 이미 적용) + 외래키 인덱스 4건. **정책 목록은 손으로 옮기지 않고
>   마이그레이션에서 스크립트로 추출**해 생성했다(HD-003).
> - **재발 방지**: Phase 22 schemaGuard에 규칙 추가 — SECURITY DEFINER 함수는 **`anon`을 지목한
>   회수**를 동반해야 한다. `FROM public`만으로는 부족하다는 걸 테스트로 못박았고, 의도적 공개는
>   allowlist에 근거와 함께 둔다. 검사가 5개 함수를 전부 인식하는지 직접 확인했다(누락 0).
> - 검증: api 308 tests(+6) / turbo test·lint·build 18/18 GREEN.
> - **[사용자 조치 필요 · 미적용]** DDL은 실행 전 확인이 규칙이라 **적용하지 않았다.**
>   마이그레이션 2건 + Phase 20 반복 컬럼 1건이 대기 중 — manual-verification 17번.

> ## ⏭ Phase 23 완료 (2026-07-26 `/loop-eng` — 오리에게 마감일·반복 말하기)
> **착수 근거**: 피드백 C절 "오리 대화로 모든 기능 제어"가 대형이라 미착수였는데, 그중 가장
> 값싸고 값 큰 조각이 남아 있었다. 오리에게 "내일까지 장보기 추가해줘"라고 하면
> `createTodo` 도구가 **제목만** 받아 날짜가 조용히 버려졌다. Phase 20에서 만든 반복도
> 오리는 쓸 방법이 없었다.
> - **T1**: 도구가 `dueDate`(YYYY-MM-DD)·`recurrence`를 받는다. **형식이 어긋나면 조용히 버리지
>   않고 오류로 돌려준다** — 버리면 사용자는 마감일이 걸린 줄 안다.
>   반복은 core `parseRecurrence`를 통과한 것만 저장하고 정규화해서 넣는다(모델이
>   `FREQ=BIWEEKLY` 같은 없는 규칙을 지어낸다). 시각은 아예 안 받는다 — 모델이 타임스탬프를
>   만들면 시각·타임존을 지어내고 그건 실제로 터졌던 버그다(피드백 iter5, '내일'이 11일 뒤로).
> - **저장 규약을 여기서 못박았다 — 마감일은 `T00:00:00.000Z`(UTC 자정).** 할 일 화면은 오늘
>   필터를 `dueDate.slice(0, 10) === todayIso()`로 판정한다. KST 자정으로 저장하면 UTC로는 전날
>   15:00이라 잘라낸 날짜가 하루 앞선다. **지금까지 마감일을 쓰는 곳이 없어 안 드러났을 뿐**이고
>   오리가 첫 기록자가 되므로 규약을 정하고 테스트로 잠갔다.
> - **T2**: 승인 카드에 마감일·반복 노출. 반복은 `describeRecurrence`로 한국어로 푼다
>   (`FREQ=WEEKLY;BYDAY=TU`를 그대로 띄우면 판단에 도움이 안 된다). **풀이가 안 되는 값은
>   원문을 보여준다** — 모델이 이상한 규칙을 냈다는 사실 자체가 승인 판단 근거다.
>   안전에 직결되는 표시라 컴포넌트에서 `lib/approvalLabel.ts`로 분리해 테스트로 잠갔다.
> - **모델 판단의 한계를 인정하는 설계**: "다음 주 화요일"이 며칠인지는 모델이 정한다. 서버는
>   형식과 실재하는 날짜인지까지만 보증하고, **정확성 판단은 사용자가 승인 카드를 보고** 한다.
> - 부수(접근성): 메모 수정 입력창에 접근 가능한 이름이 없어 스크린리더가 이름 없는 입력란으로
>   읽던 것 수정. 정적 스윕에서 나온 나머지 후보는 전부 오탐으로 확인(파일 선택은 라벨 안에 있음).
> - 검증: api 302 tests(+8) · web 181 tests(+12) / turbo test·lint·build 18/18 GREEN.
> - **[사용자 확인]** 실제 대화 검증은 로그인 + Gemini 필요, 반복 저장은 마이그레이션 선행 —
>   manual-verification 16번.
> **다음: Phase 23 소진 → SCOPE로 신규 로드맵 발굴.**

> ## ⏭ Phase 22 완료 (2026-07-26 `/loop-eng` — 스키마 안전 계약 정적 검사)
> **착수 근거**: Supabase 어드바이저가 액세스 토큰이 없어 **세 사이클 연속 미실행**이다.
> 그중 마이그레이션 파일만 읽어도 결정적으로 판정되는 항목은 코드로 가져왔다 — "괜찮을 것"이라고
> 적는 대신 확인 가능한 만큼만 확인한다.
> - **잠근 규칙 4가지**: ① 모든 테이블 RLS 활성(19/19 통과) ② RLS 켠 테이블에 정책 1건 이상
>   (정책 없이 켜면 본인 데이터도 조용히 빈 목록) ③ 마이그레이션마다 롤백 스크립트 존재
>   ④ user_id 가진 모든 테이블이 계정 파기로 소멸.
> - **③은 이미 한 번 샜던 규칙이다** — CLAUDE.md 5절에 적혀 있었는데 2026-07-24 배치 5건이
>   아무도 확인하지 않아 빠졌고 Phase 20에서 손으로 보충했다. 손으로 돌린 검사는 또 샌다.
> - **연쇄 삭제를 계산에 넣었다**: `page_links`는 파기 목록에 없지만 `pages` cascade로 사라진다
>   — 목록만 보면 오탐이고, 오탐 나는 검사는 곧 무시된다. 단 **auth.users 연쇄는 불인정**
>   (파기는 계정을 남기고 데이터만 지우므로 그 cascade는 발동하지 않는다. 인정하면 전부 통과).
> - **검사가 통과를 가장하지 않게**: 경로를 cwd가 아닌 파일 기준으로(cwd 의존 시 0개 읽고
>   전부 통과), "실제로 읽었는가"를 먼저 단언, 판정 로직을 입출력과 분리해 **규칙 위반 가짜
>   입력에 실제로 실패하는지 11건으로 확인**. 실저장소에서도 롤백 파일을 치워 실패를 확인했다.
> - 부수: 지난 사이클 `recurrenceOptions.test.ts`가 저장소 관례(`lib/__tests__/`)를 벗어나
>   있어 옮겼다.
> - 검증: api 294 tests(+17) / turbo test·lint·build 18/18 GREEN → 배포(3527f3f).
> - **감사 결과 요약(이번 사이클 손으로 확인)**: RLS 누락 0 · 정책 0건 테이블 0 · 파기 누락 0 ·
>   롤백 누락 0. **성능 계열(인덱스)은 실제 쿼리 통계가 필요해 여전히 어드바이저 몫**이다.
> **다음: Phase 22 소진 → SCOPE로 신규 로드맵 발굴.**

> ## ⏭ Phase 21 전 Task 완료 (2026-07-26 `/loop-eng` — 파괴적 동작 안전망 일관성)
> **착수 근거**: 제품이 스스로 모순돼 있었다. 페이지는 지워도 휴지통에 남는데(is_trashed +
> TrashView + 복원·영구삭제가 이미 완성), 할 일·메모·습관은 hover로 뜨는 작은 아이콘 한 번에
> 확인도 undo도 없이 영구 소멸했다. 사용자는 그 경계를 알 방법이 없다.
> - **T1 계약**: `restoreTodo`/`restoreMemo` — 지운 행을 **같은 id로** 되살린다. 새 id면 할 일
>   순서(localStorage id 배열)와 RAG 임베딩(sourceId)이 끊긴다. user_id는 인자를 무시하고
>   로그인 사용자로 채운다(남의 데이터 생성 차단, 테스트로 잠금). 중복 되돌리기는 멱등 성공.
> - **T2 배선**: 공용 `UndoNotice`(위젯 안 인라인 — 전역 토스트 체계를 새로 들이지 않았다).
>   `role="status"`, 8초 자동 소멸, **마우스 올림·포커스 중엔 타이머 정지**(키보드로 탭 이동하는
>   중에 버튼이 사라지면 되돌릴 방법 자체가 없어진다). 연달아 지우면 key가 바뀌며 최신 것으로 교체.
>   되돌리기 실패는 조용히 넘기지 않고 알린다(복구된 줄 알면 안 된다).
> - **T3은 착수 후 설계를 바꿨다** — 습관에 되돌리기를 붙이면 **안 된다**. `habit_checks`가
>   `on delete cascade`라 습관을 지우면 체크 기록이 전부 함께 사라지고, 같은 id로 습관만
>   되살려도 스트릭은 빈 채로 온다. 되돌리기를 달면 사용자가 복구됐다고 믿고 기록을 잃는
>   **안전망처럼 보이는 함정**이 된다. → 되돌리기 대신 **삭제 전 확인**(사라질 기록 건수를
>   숫자로 밝힘, 기존 ConfirmDialog 재사용). 되돌릴 수 있으면 안 묻고, 못 되돌리면 묻는다.
> - **설계 결정(계획서에 근거 기록)**: 할 일·메모까지 soft delete로 확장하지 않았다(마이그레이션
>   2개 + 모든 조회 필터 + 타입별 휴지통 + 보관기간 청소가 따라오고, 조회 한 곳만 빠뜨려도 지운
>   항목이 검색·RAG에 되살아난다). "몇 초 뒤 진짜 삭제" 지연 방식도 기각(탭 닫으면 삭제 유실).
> - 검증: api 277 tests(+10) / turbo test·lint·build 18/18 GREEN.
>   e2e `undo-delete.spec.ts` 4건 추가(세션 있을 때 자동 실행) — 로그인 없이 도는 12건 통과, 31건 스킵.
> - **[사용자 확인]** 육안 검증은 로그인 필요 — manual-verification 15번.
> **다음: Phase 21 소진 → SCOPE로 신규 로드맵 발굴.**

> ## ⏭ Phase 20 전 Task 완료 (2026-07-26 `/loop-eng` — T2·T3 마감)
> **T2 계약 + T3 배선 완료.** 반복 할 일을 완료하면 사라지지 않고 다음 회차로 옮겨간다.
> - **완료 경로 한 곳에서만 처리** — 위젯 토글·일괄 완료·오리 에이전트가 전부 `updateTodo`를
>   지나므로 거기 붙였다. 경로마다 따로 붙이면 반드시 하나가 빠진다.
> - **완료가 아닌 갱신은 쿼리 수가 그대로다**(제목 수정·완료 해제는 반복 조회를 타지 않음).
>   회귀 테스트로 잠금 — "반복 없는 할 일의 동작은 한 글자도 안 바뀐다"가 계획서 수용 기준이었다.
> - **반복 조회 실패는 삼킨다**: 부가 기능 때문에 완료가 이 기능 붙이기 전보다 덜 안정적이 되면
>   안 된다. 실패해도 평소대로 완료되고, 진짜 실패면 뒤이은 update 에러가 그대로 올라간다.
> - **KST 경계**: 서버는 UTC로 도는데 그냥 쓰면 KST 00:00~09:00에 회차가 하루 어긋난다
>   (Phase 19 습관 체크와 같은 함정). 마감 시각은 보존하고(매주 화 오전 9시 → 다음 주도 오전 9시),
>   밀린 할 일은 마감일이 아니라 오늘 기준으로 따라잡는다.
> - **DB CHECK로 문법을 잠그지 않았다** — 파서가 이미 판정하는데 DB에도 두면 규칙이 갈라진다.
> - 화면: 행에 반복 선택 + 배지(설정된 항목은 상시 노출 — 왜 안 사라지는지 알 수 있어야 한다).
>   완료 시 낙관적 갱신값 대신 서버 응답으로 맞춘다(반복이면 서버가 "완료"가 아니라 "옮긴 상태"를 줌).
> - **리뷰가 잡은 별건**: 마이그레이션 5건에 down 스크립트가 없었다(CLAUDE.md 5절 위반) —
>   embeddings_rls_initplan·page_cover_url·page_links·atomic_xp_award·realtime_publication.
>   전건 작성해 채웠다. 이제 마이그레이션 전건이 down을 동반한다(스크립트로 재검사).
> - 검증: core 512(+12) · api 267(+9) · web 169(+8) tests / turbo test·lint·build 18/18 GREEN → 배포(de5c221).
>   **core 계약 변경이라 전 패키지 tsc가 office-tasks 픽스처 누락을 잡았다**(과거 교훈 재확인).
> - **[사용자 조치 필요]** 마이그레이션 미적용 → 반복 기능은 아직 실동작하지 않는다.
>   `supabase db push` 후 실기 검증. 절차·롤백 경로: manual-verification 14번.
> **다음: Phase 20 소진 → SCOPE로 신규 로드맵 발굴.**
>
> ## ⏭ Phase 20 착수 — T1 완료 (2026-07-26 `/loop-eng` — MUST 잔여 소진)
> Phase 19 소진 → SCOPE. **추측으로 신규 기능을 지어내기 전에, 이미 MUST로 확정해 둔 것 중 안 한 걸
> 먼저 찾았다.** 근거 소스 두 개를 코드로 전수 대조:
> - `feedback-2026-07-25.md` B절(사용자가 남긴 코드-완결 가능 항목) → **전 항목 이미 구현됨**을
>   코드로 확인(위젯 접기·통계 탭·설정 2열+연동 통합+잔디 이동·캘린더 월 그리드·오피스 에셋).
>   재구현 방지 표는 phase_20.md에 기록.
> - `FEATURES.md` MUST 19건 → 코드에 흔적 0건인 항목이 **딱 하나** 남음: **할 일 반복 규칙**
>   (`recurrence`/`rrule`/`반복 규칙` 전 저장소 0건, `todos` 테이블도 id·title·is_done·due_date뿐).
> - **T1 완료** — core `recurrence.ts`(매일 / 매주 요일 / 매월 날짜, 58 tests). 저장 문자열은 RRULE
>   어휘를 빌리되 파서는 3종만 — `rrule` 패키지는 쓰지도 않을 BYSETPOS·EXDATE·타임존까지 들여오는
>   대형 의존이라 미도입(어휘가 호환이라 나중에 승격 가능).
>   설계 핵심 3가지: ① 파싱 실패는 throw가 아니라 null(DB에 깨진 값이 있어도 반복만 꺼질 뿐 할 일
>   목록 전체가 죽으면 안 된다) ② 결과는 **항상 기준일보다 뒤**(같은 날 반환 시 완료해도 제자리 =
>   무한 루프. 한 달치 날짜 x 6규칙 단조증가 테스트로 잠금) ③ 매월 31일이 2월을 만나면 회차를
>   건너뛰지 않고 말일로 자른다(윤년 29일 포함) — 건너뛰면 반복 할 일이 사라진 것처럼 보인다.
> - **인스턴스를 미리 만들지 않는다**: 이 프로젝트는 무료 원칙상 서버 스케줄러가 없다. 미래 회차를
>   미리 생성하면 행 폭발 + 정리 스케줄러가 필요해진다. 대신 **완료 시 다음 회차로 굴린다**(행 1개
>   유지) — Todoist 기본 동작과 같은 모델. T3에서 배선.
> - 검증: core 500 tests(+58) / 전 패키지 turbo test·lint(17/17)·build(6/6) GREEN → origin/main 배포(df80ca9).
> - **남은 것**: T2 마이그레이션(`recurrence` 컬럼 + down) · T3 완료 시 롤오버 + 설정 UI.
> - **[사용자 조치 필요]** Supabase 어드바이저가 이번 세션에서도 `Unauthorized`로 차단 —
>   MCP 액세스 토큰 필요. 추측으로 "RLS 괜찮을 것"이라 쓰지 않았다. manual-verification 13번.
>
> ## ⏭ Phase 19 착수 — VOC 주도 SCOPE (2026-07-26 `/loop-eng`)
> Phase 18 소진 → 신규 로드맵 발굴. **마케팅 프레임워크 대신 `docs/feedback-2026-07-25.md`의 실제
> 사용자 피드백을 근거로 삼았다** — 추측 후보보다 사용자가 말로 요구한 미완 항목이 우선한다.
> 착수 전 코드로 중복 확인(이번 세션에 재구현 2회 위반 이력): 앱 액션 5종 존재·습관 체크만 없음,
> 뉴스 주제 필터 0건 확인. 계획: docs/plans/phase_19.md.
> - **T1 오리 대화 습관 체크** — 피드백 iter11이 "습관 체크 … 후속"으로 남긴 미완. 제목 매칭은 기존
>   `findTodoByTitle`(제네릭) 재사용, 다중 일치·미발견 시 아무것도 바꾸지 않고 되묻는다.
>   이미 체크된 습관은 에러가 아니라 **멱등 성공**으로 답한다(유일 제약 23505 흡수).
>   **서버 UTC 함정**: `new Date()`로 날짜를 만들면 KST 새벽에 어제로 기록된다 → core `kstDateString`
>   추가(+5 tests). 승인 카드 라벨도 추가.
> - **T2 뉴스 주제별 추천 피드** — 피드백 C절 "주제별 큐레이션". core `news-feeds.ts`(개발/AI/엔지니어링
>   3주제 9피드) + 뉴스 화면 1클릭 추가 칩(등록된 건 자동 제외). **URL은 추측하지 않고 9개 전부 실제
>   요청해 200 + RSS/Atom 확인 후 등록**(피드백 iter6 "등록했는데 0건" 재발 방지).
>   주식·부동산은 신뢰할 만한 무료 RSS를 자율로 고를 근거가 없어 **의도적으로 비웠다**.
> - 탈락(계획서에 근거 기록): 조회 도구(RAG와 중복), 삭제·수정 액션(오삭제 위험), 뽀모도로(클라 타이머).
> - 검증: core 442 · api 258 · web 158 tests / 전 패키지 tsc / lint / next build GREEN.
> - **[사용자 확인]** 5분 cron이 또 끼어들어 작업 중인 트리에 다른 변경을 섞었다(오리 영상 로고).
>   **cron 삭제함.** 해당 작업은 별도 커밋으로 분리했고, 사용자 제공 mp4 2개는 삭제가 아니라
>   ASCII 파일명으로의 **이름 변경**임을 바이트 크기 대조로 확인했다(1034383·2460380 일치).

> ## ⏭ Phase 18 전 Task 완료 (2026-07-26 `/loop-eng` — T4 주간 다이제스트 마감)
> **T1 공유 카드 · T2 시작 템플릿 · T3(축소) 빈 상태 · T4 주간 다이제스트 · T5 SEO 표면 — 모두 코드 완료.**
> 이번 사이클은 T4 수직 슬라이스(집계 → 본문 → 페이지 생성 → 알림)를 끝냈다.
> - **집계**: api `gatherActivity(supabase, since, until?)` — 기존 스탠드업의 24시간 수집을 기간 인자로
>   일반화(스탠드업은 until 없이 호출해 동작 불변). 지난 주 구간을 **로컬 자정 기준**으로 만든다
>   — 날짜 문자열을 ISO로 그대로 넘기면 UTC 해석으로 하루가 밀린다.
> - **본문**: core `formatWeeklyDigestLines` — **LLM을 쓰지 않는다**. 스탠드업(일간)이 이미 Gemini
>   요약을 담당하고, 주간 다이제스트는 무료 쿼터가 없거나 소진돼도 반드시 떠야 하는 복귀 훅이라
>   수치 요약으로 충분하다. 일정이 많은 주에 요약이 일정 목록으로 뒤덮이지 않게 5건에서 절단.
> - **배선**: `WeeklyDigestTrigger`(화면 없는 배경 컴포넌트, DesktopCollectorSync와 같은 패턴).
>   서버 스케줄러가 없으므로(무료 원칙) **방문이 트리거**. 실패는 조용히 넘긴다 — 사용자가 요청한
>   작업이 아니라 배경 작업이라 에러 토스트는 노이즈다. 주차 키를 성공 시에만 저장해 자연 재시도.
> - **자체 리뷰가 잡은 구멍**: 주차 키가 localStorage(기기별)라 **데스크톱 위젯과 브라우저를 같이 쓰면
>   같은 주 다이제스트가 두 번 생긴다.** 제목에 기간이 박혀 있으므로 생성 전 **서버에서 같은 제목
>   페이지를 확인**해 막았다.
> - 검증: core 426 · api 252 · web 147 tests / 전 패키지 tsc / lint / next build GREEN.
> - **[미검증]** 로그인 + 실제 활동 데이터 + 주 경계 경과가 필요해 육안 확인 불가 —
>   manual-verification.md 11번(재현 절차 포함).
> **다음: Phase 18 소진 → SCOPE로 신규 로드맵(phase_19) 발굴.**
>
> ## ⏭ Phase 18 T5 완료 (2026-07-26 `/loop-eng` — 발견성/SEO 표면)
> `robots.ts` + `sitemap.ts`. 이번 사이클은 로그인 없이 **실서버로 실제 검증이 되는** 작업이라
> curl 응답까지 확인했다.
> - **검증이 또 버그를 잡았다**: `/robots.txt`·`/sitemap.xml`이 proxy PUBLIC_PATHS 누락으로 303
>   리다이렉트 — 크롤러가 robots를 못 읽으니 SEO 정책 자체가 무의미한 상태였다(`/opengraph-image`와
>   같은 부류의 누락). 공개 경로 추가 → 200 확인. 파일 만들고 빌드만 봤으면 그대로 배포됐을 버그.
> - **계획서가 남긴 프라이버시 질문 확정 — 사이트맵에 공개 slug를 싣지 않는다.** Phase 12 T1이
>   열거 방지를 위해 RPC로 한 건씩만 반환하도록 설계했는데, 사이트맵이 전 slug를 나열하면 그 방어를
>   우리 손으로 무력화한다. 사용자는 링크를 골라 공유한 것이지 목록 공개에 동의한 게 아니다.
>   개별 페이지는 공유 링크로 도달·색인되고(robots `/p/` 허용) 목록은 배포하지 않는다.
> - **robots는 deny-by-default** — 사적 경로를 하나씩 막는 방식은 새 라우트를 빠뜨리면 워크스페이스가
>   색인되는 쪽으로 샌다. `Disallow: /` + 공개 표면만 열어 새 라우트는 기본 비공개가 되게 했다.
> - 정책은 테스트로 잠금(8 tests, "사이트맵에 /p/ 없음"은 완화 금지 주석 포함).
> - 검증: core 416 · api 248 · web 140 tests / tsc / lint / next build / 실서버 curl GREEN.
>   증거: `docs/loop-eng/screenshots/2026-07-26/phase18-t5-seo/served-output.md`.
> **Phase 18 남은 것: T4 나머지(주간 집계 → 페이지 생성 → 알림 배선). T1·T2·T5 완료, T3 축소 완료.**
>
> ## ⏭ Phase 18 T3 부분·T4 착수 (2026-07-26 `/loop-eng`)
> - **T3 빈 상태 코치 — 축소 판정**: 전 화면 빈 상태를 전수 조사하니 대부분 **이미 안내 문구가 있었다**
>   (투두·뉴스·통계). 계획서 전제("각 뷰가 막다른 길")가 이미 대체로 해소된 상태라, 공용 EmptyState로
>   전 화면을 갈아끼우는 건 겉모습만 바꾸는 과잉 작업으로 판단하고 **실제 결함 1건만** 고쳤다.
>   → **표 뷰 빈 상태가 거짓말하던 버그**: 표는 필터를 거친 행만 받는데, 필터가 전부 걸러내도
>   "아직 행이 없습니다"가 떴다(행이 20개 있어도 없다고 말함). `dbEmptyMessage`로 원본 개수·필터
>   유무를 보고 사실대로 안내(+5 tests). 캘린더 위젯은 CTA 자리가 마땅치 않아 의도적으로 남김.
> - **T4 주간 다이제스트 — 트리거 로직 완료(UI 미배선)**: core `weekly-digest.ts` — 요약 대상은
>   **지난 주**(이번 주를 요약하면 주 중간 다이제스트가 반쪽), 같은 주 중복 생성 방지, 저장 키 오염·
>   기기 시계 되돌림 방어. 13 tests. 기존 스탠드업(일간·LLM)과 별개 기능임을 확인.
> - 검증: core 416 · api 248 · web 132 tests / 전 패키지 tsc / 변경 lint / next build GREEN.
> **다음: T4 나머지(주간 집계 → 페이지 생성 → 알림 배선) 또는 T5(SEO 표면).**
>
> ## ⏭ Phase 18 T2 완료 + 보류 결정 3건 처리 (2026-07-26 `/loop-eng` — 사용자 "알아서 결정" 위임)
> **인벤토리 위반 자수**: T2 시작 템플릿을 core에 새로 만들다가, 이미 `apps/web/src/lib/pageTemplates.ts`에
> 템플릿 7종(회의록·일일 노트·주간 회고 등)이 있는 걸 발견했다. 내가 만든 core 모듈은 재구현이라
> **삭제하고 기존 것을 확장**했다. 실제로 빠져 있던 건 세 가지였다:
> - **데이터베이스 템플릿**(기존 시스템은 dbSchema 개념 자체가 없었음) — "프로젝트 트래커"(상태·우선순위·
>   마감일 + 칸반), "독서 목록"(상태·지은이·별점) 2종 추가. 열·뷰가 잡힌 채로 바로 열린다.
> - **날짜 제목** — "일일 노트"·"주간 회고"가 같은 제목으로 계속 쌓이던 문제. `templateTitle`로 만든 날짜
>   (주간은 그 주 월요일)를 붙인다. 날짜 계산은 core `toLocalDateString`/`startOfWeek`로 공용화
>   (로컬 포맷이 web·core 3곳에 중복돼 있었음, 4번째 복제 대신 추출).
> - **노출** — 템플릿이 사이드바 `+` 메뉴 안에만 숨어 있었다. 빈 상태를 "아직 페이지가 없습니다." 한 줄에서
>   "템플릿으로 시작하기 →" CTA로 교체(T3 빈 상태 코치의 첫 슬라이스).
> - **계약 확장**: `createPage`가 `dbSchema`를 받는다(rowProps와 동일한 zod 검증 패턴, +3 api tests).
>   덤으로 **기존 버그 수정** — 데이터베이스 페이지 복제 시 열·뷰가 통째로 유실되던 문제(코드 주석이
>   "createPage 계약상 미포함"이라 명시하던 제약)가 해소됐다.
> - 검증: core 403 · api 248 · web 127 tests / 전 패키지 tsc / 변경 lint / next build GREEN.
> - **[미검증]** 템플릿 갤러리·빈 상태는 로그인 뒤 화면이라 로컬에서 실제 렌더를 못 봤다. 앱을 못 띄우는
>   상태에서 마크업만 흉내 낸 스크린샷은 만들지 않았다 — manual-verification.md 10번.
>
> **보류였던 결정 3건 처리(사용자 위임)**:
> - **랜딩 유입 지표를 막던 차단 2건 수정** — `/welcome` CSP nonce 차단(정적 프리렌더라 요청별 nonce를
>   못 심음) → `force-dynamic` 한 줄. 그리고 CSP를 고쳐도 죽어 있던 Vercel Analytics
>   (`/_vercel/insights/script.js`가 미들웨어에 걸려 303→HTML) → matcher에 `_vercel` 제외.
>   CSP 콘솔 오류 23건 → 0건, 하이드레이션 정상. 증거: `screenshots/2026-07-26/phase18-csp-welcome/`.
> - **에셋 zip 3개 배포 제외** — 코드 참조 0건인 원본 아카이브가 `public/`에서 공개 URL로 재배포되고
>   있었다(에셋 팩 라이선스 위반 소지). gitignore + 추적 해제(로컬 파일·git 이력 보존).
> - **OG 카드 한글 제목 = 넣지 않음으로 종결** — 카톡·슬랙·X 모두 og:title을 텍스트로 렌더하므로 이미
>   보인다. 폰트 1.5MB 추가나 미문서화 UA 트릭 런타임 fetch는 얻는 것보다 잃는 게 크다.
> **다음: Phase 18 T3(빈 상태 코치 — 투두·뉴스·DB 뷰로 확대) 또는 T4(오리 주간 다이제스트).**
>
> ## ⏭ Phase 18 T1 완료 (2026-07-26 `/loop-eng` — 공개 페이지 바이럴 루프)
> **공유 링크가 카톡·슬랙·X에서 브랜드 카드로 뜨게 하는 OG 이미지 + 메타데이터 정비.** 배지는 이미
> PublicFooter에 있어(Phase 12 T1) 재구현하지 않음.
> - core `publicPageMetaCopy`(제목 1줄 정규화·70자/설명 200자 코드포인트 상한·빈 제목 폴백, 8 tests)
>   + `resolveSiteUrl`(NEXT_PUBLIC_SITE_URL → VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL → localhost, 8 tests).
> - web 루트 `opengraph-image.tsx`(1200x630, next/og, 외부 에셋·의존 0 — 절차적 오리 + 워드마크).
>   정적 프리렌더(`○`)라 런타임 비용 없음. 모든 라우트가 물려받음(/welcome·/p/[slug]).
> - **화면검증이 잡은 실제 버그 3건 수정**: ① `/opengraph-image`가 proxy PUBLIC_PATHS에 없어 303 —
>   크롤러가 카드 이미지를 아예 못 받던 상태 ② `metadataBase` 미설정으로 og:image가 `localhost:3000`으로
>   나감(정적 페이지에 빌드 시점 값이 박힘) ③ `/p/[slug]` title에 브랜드를 직접 붙여 layout template과
>   중복("… — Little Dev Duck — Little Dev Duck").
> - **이미지 안 한글 제목은 축소**: satori는 한글 폰트 버퍼가 있어야 하는데 저장소에 한글 폰트가 없어
>   넣으면 두부(□)로 깨진다. 카톡·슬랙·X 모두 og:title을 텍스트로 따로 렌더하므로 한글 제목은 이미 보인다.
>   폰트 자산(~1.5MB) 도입 여부는 사용자 결정 — manual-verification.md 9번.
> - 검증: core 393 tests(+16)·tsc / api 245 · ai 10 · mascot 9 · ui tsc / web tsc · next build · lint 전부 GREEN.
>   스크린샷 5장 + 매니페스트: `docs/loop-eng/screenshots/2026-07-26/phase18-t1-public-og/`.
> - **[사용자 확인 필요 · 우선순위 높음]** `/welcome`의 **모든 스크립트가 CSP nonce로 차단**되는 기존 버그
>   발견(이번 작업과 무관). 정적 프리렌더 HTML엔 요청별 nonce를 넣을 수 없어 하이드레이션·Vercel
>   `<Analytics/>`가 죽는다 — **랜딩 유입 지표 측정 불가**라 Phase 18 목적과 충돌. 수정안 3가지가 전부
>   보안 태세 변경이라 자율 미결정. 상세·재현: manual-verification.md 7번.
> **다음: Phase 18 T2(시작 템플릿 갤러리) 또는 T3(빈 상태 코치).**
>
> ## ⏭ 신규 로드맵 발굴됨 (2026-07-25 `/loop-eng` SCOPE — 마케팅팀 주도)
> **로드맵 소진(Phase 1~17 + 감사 22 + 픽셀오피스 A~I) → 정지 대신 marketing-skills로 신규 로드맵 생성.**
> **Phase 18 — 공유·성장 루프**(docs/plans/phase_18.md): 노션 패리티가 아니라 제품 고유 강점(공개 페이지
> 공유·오리·픽셀오피스)을 AARRR 성장 루프로 전환. 무료 원칙·단일 사용자 모델 준수. T1 공개페이지 바이럴
> 루프(powered-by 배지 + OG 이미지 자동생성) → T2 시작 템플릿 갤러리 → T3 빈 상태 코치 → T4 오리 주간
> 다이제스트 → T5 발견성/SEO. 탈락: 멀티유저 referral·수익화(무료원칙·YAGNI). **다음: T1부터 BUILD.**
>
> ## ⏭ 다음 세션 이어서 하기 (2026-07-25 `/loop-eng` 자율 — 시트 파일명 규약 core 추출)
> **이번 `/loop-eng` 반복 결과(5db76b9): office-characters.ts sheetUrl의 파일명 매핑을 core
> `characterSheetFileName`로 추출 + 디스크 실제 파일명 8개를 계약 테스트로 잠금.** 파일명 불일치는 로더가
> catch로 조용히 폴백해 화면으로만 발견되던 표면(e5168b5 우향프레임 버그와 같은 부류) — 결정론적 회귀 차단.
> 검증: core 377 tests(+3)·tsc / web tsc / core·web(변경파일) lint GREEN. 미테스트 lib 잔여
> (office-draw·sprite-loader·office-sound·realtime·apiHelpers)는 재확인 결과 전부 canvas/DOM/WebAudio/
> Supabase realtime/NextResponse = 순수 로직 아님(추출 대상 소진 재확인). 미커밋 변경 없음(zip 제외).
>
> **직전 `/loop` 반복 결과(baseline 검증)**: test 11/11 패키지 · lint 11/11 · build 6/6, 전부 turbo 캐시 히트.
> **2026-07-24 인계 이후 실제 진행(git log, Status 최상단이 그간 stale했음)**: 픽셀 오피스 스레드 계속 —
> Modern Interiors 통합(39924fc) → 직원 스프라이트 좌향 반전 수정(e5168b5) / 앱-액션 자동 RAG 인덱싱
> (ce81445·9a8f4ce) / web lib 순수함수 테스트 추출(bookmarkedArticles a44ce0c).
> **자율 코드-완결 스코프 재확인 = 소진**: web lib 잔여 미테스트 파일(office-draw·realtime·sprite-loader·
> office-sound·apiHelpers)은 전부 canvas/DOM/env — 순수 로직 아님(순수분은 이미 core로 추출·테스트). core
> office 도메인 11파일 전부 대응 테스트 존재. 활성 오피스 작업은 시각 폴리시(최근 버그 2건 다 육안 발견)라
> 자율 검증 불가.
> **더 진행하려면 사용자 필요(unblock 목록)**: ① OAuth 기기 실기검증(Google Calendar/GitHub/Gmail 어댑터)
> ② Sentry 계정(13 T5) ③ i18n 착수 승인(13 T6, 대규모) ④ Tauri sidecar/hooks·RN 기기(오피스 실이벤트 연동)
> ⑤ 픽셀 오피스 시각 폴리시 육안 검증. **인프라(db push)는 2026-07-24 Supabase MCP로 전건 적용 완료 — 더는 블로커 아님.**
> **미추적 파일**: `apps/web/public/Modern_Interiors_Free_v2.2.zip`(1.1MB 원본 아카이브) — 추출 스프라이트는
> 39924fc에 커밋됨. 직전 커밋이 추출본만 넣은 의도를 존중해 zip은 미커밋 유지. 커밋/gitignore/삭제는 사용자 판단
> (public/에 이미 다른 zip 2개는 추적 중이라 관례 상충 — 자율 미결정).
> **재개**: `/next-step` 또는 `/loop /next-step`. 새 스코프·인프라가 열리면 즉시 재개.

> ## ⏭ 다음 세션 이어서 하기 (2026-07-24 ~08:2x 인계)
> **이번 `/loop` 자율 세션 결과: 33개 커밋(기능 32 + a11y 1)을 6회에 걸쳐 origin/main 배포, CI 6회 전부 green,
> 미푸시 0.** 코드로 완결 가능한 노션-격차 고가치 기능(프로젝트 자체 gap-analysis + FEATURES.md 146항 전수
> 대조)을 사실상 소진.
> **재개 방법**: 새 세션에서 `/next-step` 또는 `/loop /next-step`. (워치독 cron `7dc122ee`는 세션 전용이라
> 세션 종료 시 소멸 — 다음 세션에서 재설정 필요.)
> **다음 세션 최우선(사용자 인프라가 열려야 진행 가능)**:
> 1. `supabase db push` 미적용 4건 — pages_db_view(11)·pages_public_share(12)·delete_all_my_data(13)·news(15).
>    적용 후 DB 뷰/공개공유/계정삭제/뉴스 실기 검증.
> 2. OAuth 기기 실기검증(Google Calendar/GitHub/Gmail 어댑터), Gemini 키가 `/api/ai/write`에도 필요(이미 등록됨).
> 3. 인프라 열리면 코드-완결 가능한 다음 차수: Realtime 멀티서피스 동기화(publication 마이그레이션+subscribeTable),
>    백링크(page_links 테이블), 페이지 커버(cover_url 컬럼) — 전부 마이그레이션 선행.
> 4. 새 의존성 P2(자율 보류): 코드블록 하이라이팅(@blocknote/code-block), 수식/컬럼 — lockfile·CI frozen 위험.
> **이번 세션 신규 기능은 아래 각 Phase "후속" 항목과 git log 참조.**

> **`/loop` 자율 세션(2026-07-24 04:2x~ 시작) 진행 중**: 코드 완결 가능한 노션-격차/이월 기능을 STDD+ponytail로
> 연속 구현·커밋(각 tsc+eslint+테스트 GREEN). **푸시·배포 정책: 6시간 간격.**
> **1차 배포(~06:55 KST)**: 21개 기능 + 리뷰 수정 배치. 검증=리뷰(code+security, CRITICAL 0, HIGH/MEDIUM
> 전건 수정) + 테스트 + web tsc + 전체 eslint + next build GREEN. push 직후 CI red(api 빌드 tsc가 테스트 파일
> 포함 — pages.test 뷰 픽스처 sort/filters 누락) 발견·즉시 수정 → CI green. **교훈: core 계약 변경 시 전 패키지
> tsc 필수**(메모리 기록).
> **2차 배포(~07:35 KST)**: DB 열숨기기·팔레트 최근페이지·보드 select 칩·단축키 도움말 4개.
> **3차 배포(~07:50 KST)**: 뉴스 읽음상태·모두읽음·표 행개수 3개. 전 배포 전 패키지 tsc + 테스트 423 + web
> tsc/eslint/next build 검증, CI(lint-and-test + e2e Playwright) 전부 green. **누적 28개 기능 배포.**
> **자율 한계 도달**: 코드로 완결 가능한 고가치 노션-격차/이월 기능 대부분 소진. 남은 로드맵 항목은 사용자
> 인프라 필요(아래 목록). 과잉 기능은 자제. cron 워치독(1분)이 루프를 살려두며, 사용자가 인프라를 열거나
> 새 요구가 생기면 재개. **[사용자 결정/입력 대기]**: ① `supabase db push`(pages_db_view·pages_public_share·
> delete_all_my_data·news 마이그레이션) ② OAuth 기기 실기검증(Calendar/GitHub/Gmail) ③ Sentry 계정(13 T5)
> ④ i18n 착수 승인(13 T6, 대규모) ⑤ Tauri/RN(기기). 완료 기능은 아래 각 Phase "후속" 및 git log 참조.
> **중간 리뷰(2026-07-24, 20커밋 누적 diff)**: code-reviewer + security-reviewer 병렬 실행. **CRITICAL/배포차단 0건.**
> HIGH 1건(낙관적 업데이트 stale rollback — 실패 응답이 그 사이 성공한 최신 편집을 덮어씀) + MEDIUM 3건
> (에러 타이머 미취소, addFilter MAX_FILTERS 미가드, CSV 수식 인젝션) + 보안 선택 1건(RSS href 스킴) **전부 수정**.
> stale rollback은 함수형 업데이터로 "현재값==내가 설정한 값일 때만 롤백"으로 해소. 전체 테스트 422 GREEN
> (core 196/api 211/ai 10/mascot 5) + web tsc + 전체 eslint GREEN.

현재 Phase: **Phase 13(상용 마감) — T1~T4 코드 완료(2026-07-24, `/loop` 인계 세션). T1 온보딩 튜토리얼,
T2 키보드 접근성(전역 focus 링+공용 모달 훅+스킵 링크), T3 계정 데이터 파기 1단계(security-definer RPC
+위험구역 UI, 강한 확인 게이트), T4 공개 랜딩(/welcome, 비로그인 리다이렉트 대상). T5 Sentry·T6 i18n은
인프라·범위로 이월. Phase 12(공개 공유+알림+대시보드) T1~T5 코드 완료(T6 대시보드 이월, 최종 리뷰 대기).
Phase 11(DB 뷰) T1~T5 완료·배포. Phase 10은 코드 완료.
미적용 마이그레이션: ~~db push 대기 4건~~ → **2026-07-24 Supabase MCP로 전건 적용 완료**
(user_github_tokens, user_gmail_tokens, pages_db_view, pages_public_share, delete_all_my_data, news — 총 6건).
Phase 완료분은 실기 검증만 남음(코드+DB 전부 배포됨).**

## 발굴된 개선점 (2026-07-24 /plan 5인 감사 + 내부 패널 교차검증)

> 5인 감사관(code-reviewer, security-auditor, ui-ux-designer, test-automator, technical-researcher) 병렬 스윕
> → 내부 회의 패널(증거 검증 debugger 14/15 TRUE + 가치 반박 task-decomposition-expert) 교차검증.
> 교차검증 모드: internal-panel (외부 AI CLI 미설치). 정지 사유: round 1 충분(하드캡 미도달).
> 총 79건 발굴 → 중복 제거·병합 후 25건 평가 → 2건 SKIP·1건 FALSE 탈락 → **22건 확정**.

### MUST (priority 1) — 즉시 수정

- [x] GEMINI_API_KEY 가드 5곳 → 공용 requireGeminiKey 헬퍼 추출 ✅ 04c2a1a
- [x] SSRF 가드 강화: IPv6-mapped·redirect chain 방어 ✅ 04c2a1a
- [x] deleteFeed/setFeedStatus에 user_id 필터 추가 ✅ 04c2a1a
- [x] agent.ts INJECTION_GUARD를 Gemini systemInstruction 필드로 이동 ✅ 04c2a1a
- [x] embeddings RLS initplan: auth.uid() → (select auth.uid()) ✅ 04c2a1a + Supabase MCP
- [x] sortRows/filterRows 테스트 추가 ✅ 04c2a1a

### SHOULD (priority 2) — 다음 차수

- [x] 오리 스탠드업 생성기: 24h 활동 → Gemini 요약 → 페이지 자동생성 ✅ bedd1e5
- [x] 습관 히트맵 + 뽀모도로 InsightsView 통계 ✅ cdd4083
- [x] 습관 히트맵 + 뽀모도로 통계 (중복 — 위에서 완료) ✅ cdd4083
- [x] 임베딩 upsert 배치화 ✅ ff066df
- [x] XP 원자적 증가: award_xp Postgres RPC ✅ 91666c8
- [x] OAuth 토큰 모듈 통합: oauthTokens.ts generic factory ✅ ff066df
- [x] 모바일 하단 네비게이션: 고정 하단 탭바 5항목 ✅ ef87a43
- [x] ConfirmDialog 공용 컴포넌트: 3곳 대체 ✅ ef87a43
- [x] CommandPalette ARIA: listbox/option/activedescendant ✅ ef87a43
- [x] unbounded query .limit(500) 7개 함수 ✅ ff066df
- [x] page_versions 쓰기 상한: per-page 50건 ✅ 3c65108
- [ ] apps/web/src/lib/ 테스트: vitest 설정 + 순수함수 테스트 (진행 중)

### NICE (priority 3) — 후속

- [x] 백링크 page_links 테이블 + API ✅ 91666c8 (UI 후속)
- [x] 페이지 커버 cover_url 컬럼 + UI ✅ 6959510
- [x] Realtime 멀티서피스 동기화 ✅ 87263f0
- [x] hover-revealed 버튼 focus-visible 링 ✅ 3c65108
- [x] listPages SELECT 프로젝션: content 제외 ✅ 91666c8

## 픽셀 오피스 대규모 확장 로드맵 (2026-07-24 /plan, 스타듀밸리급)

> 아키텍처: docs/plans/pixel-office-expansion.md (9 Phase, 33 Task)
> 사용자=CEO 오리, 9개 부서(개발/마케팅/디자인/인사/재무/영업/고객지원/QA/운영)

### Phase A: 타일맵 기반 ✅ f7cedd9 + 2fd3e46
- [x] T-A1 타일맵 데이터 구조 (TileType 24종, TileMap, 충돌/존)
- [x] T-A2 카메라 뷰포트 시스템 (lerp follow, clamp, worldToScreen)
- [x] T-A3 맵 빌더 40x30 컴팩트 (15존)
- [x] T-A4 고퀄 오리 + 에셋 통합 (ducky spritesheet + PixelOffice 타일셋)
- [x] T-A5 PixelOffice.tsx 카메라 통합 (ResizeObserver 반응형)
- [x] T-A6 movePlayer 타일맵 충돌 연동

### Phase B: 스프라이트 시스템 ✅ db89c7b + 6959510
- [x] T-B1 sprite-loader.ts (오리+가구+타일셋 비동기 로딩)
- [x] T-B2 오리 spritesheet (ducky_2/3, 4방향x6프레임)
- [x] T-B3 drawDuckSprite/drawHumanSprite + 절차적 폴백
- [x] T-B4 TILESET_MAP 23 TileType 매핑 + 40종 가구 PNG

### Phase C: 모바일 터치 ✅ 35b1283
- [x] T-C1 InputManager (키보드+터치 통합)
- [x] T-C2 VirtualDpad (방향4+A, 48px, hold-to-repeat)
- [x] T-C3 탭-투-인터랙트 (screenToWorld)
- [x] T-C4 반응형 캔버스 (ResizeObserver)

### Phase D: 부서 레이아웃 ✅ a59626c
- [x] T-D1 9부서 메타데이터 (DEPT_REGISTRY, 35 오리이름)
- [x] T-D2 40x30 컴팩트 플로어플랜
- [x] T-D3 부서별 가구 배치 (furnishDesks)
- [x] T-D4 방 전환 + 문 + 구역 HUD

### Phase E: NPC 행동 ✅ a59626c + ff066df
- [x] T-E1 GameClock (1초=1분) + schedulePhase
- [x] T-E2 NPC 상태머신 + simulateNpcTasks
- [x] T-E3 A* 경로탐색 (office-pathfind.ts) + NPC 배회
- [x] T-E4 NPC 개성 (이름/역할/부서별 악세사리/인간 스프라이트)

### Phase F: CEO 상호작용 ✅ 72d3001 + fa83a09
- [x] T-F1 OfficeTalkPanel (작업 진행률바, 역할/부서)
- [x] T-F2 NPC 작업 시뮬레이터 + 실데이터 연동
- [x] T-F3 OfficeDashboard (9부서 카드 + 활동 피드)
- [x] T-F4 OfficeManagementPanel (경영 시뮬: 자금/수익/평판)

### Phase G: 비주얼 폴리시 ✅ 72d3001
- [x] T-G1 낮/밤 팔레트 전환 (timeOfDay + overlay)
- [x] T-G2 미니맵 오버레이 (drawMinimap, M키 토글)
- [x] T-G3 구역 이름 HUD (페이드 애니메이션)

### Phase H: 사운드 ✅ 37b6af5
- [x] T-H1 BGM (Web Audio lo-fi 패드 코드)
- [x] T-H2 SFX (footstep/interact/typing/door, N키 뮤트)

### Phase I: 실이벤트 연동 — 인프라 필요
- [ ] T-I1 Claude Code hooks → 오피스 이벤트 (Tauri 필요)
- [ ] T-I2 Tauri sidecar WebSocket (Tauri 필요)

### 탈락 (교차검증 미통과)

- ~~Approval UI HMAC binding~~ — 서버측 catalog 재검증이 이미 존재 (evidence FALSE)
- ~~useDuckChat hook 테스트~~ — 핵심 순수함수 이미 테스트됨 (SKIP)
- ~~createClient per render~~ — Supabase JS 내부 싱글톤 처리 확인 필요 (SKIP)

**인계 경위(2026-07-24 01:00~)**: 먼저 돌던 `/loop` 세션이 Phase 13 T1 커밋(01:00) 후 27분간 정지 →
두 번째 `/loop` 세션(사용자 새로 지시)의 워치독이 죽음으로 판단하고 개발 인계. 같은 폴더 공유(worktree
격리 없음)라 병렬 편집 대신 단일 세션 인계로 진행. **목표(Phase 17까지) 도달** — 인계 세션이 Phase 13
T2~T4 + Phase 14 스코프 + Phase 15/16/17 코드 슬라이스를 순차 구현·커밋. 각 Phase의 인프라/기기/OAuth/
DDL 필요분(db push 4건 등)은 이월(사용자 몫). 로드맵 Phase 1~17 전부 최소 1개 슬라이스 코드 완료 상태.
Phase 1~9 전부 완료. `supabase db push` 2건 사용자 적용 확인(Supabase MCP로 직접 재확인 완료 —
마이그레이션 18개 전부 local==remote, `user_google_tokens`/`action_log` 테이블 RLS 켜진 채 존재).
계획 문서: docs/plans/phase_01~10.md, 리뷰 스냅샷 docs/reviews/2026-07-21-phase5.md·2026-07-22-phase9.md.

**T3 실기 검증 경과(2026-07-23, 사용자+세션 협업)**: 오리 대화창 통합(단일 DuckChatPanel) 배포 후 사용자가
직접 시도하며 실회귀 4건을 순차 발견 → 전부 그 자리에서 수정·배포. Google Calendar MCP로 사용자 실제
캘린더를 직접 조회해 "코드는 성공을 반환했는데 실제로 반영 안 됨" 부류의 버그까지 검증 가능했던 게 큰 도움.
1. **Google Cloud OAuth 재설정**: 기존 클라이언트를 찾지 못해 사용자가 새 GCP 프로젝트에 OAuth 클라이언트
   신규 발급 → Supabase Google 프로바이더 Client ID/Secret 교체. **캘린더 API 활성화 누락**으로 403 발생
   → 사용자가 활성화.
2. **routeUtterance 버그**: "내일 회의잡아줘"류 짧은 명령문이 키워드 매칭 없이 길이<=12 폴백에 걸려 rule로
   분류돼 Gemini 호출 자체가 안 됨 → "~줘" 어미를 QUESTION_HINT에 추가(8b1d8b1).
3. **thoughtSignature 유실**: gemini-flash-latest가 함수 호출 응답에 얹는 thoughtSignature를 우리 코드가
   모델 turn을 재구성하며 빠뜨려 도구 루프 2회차에서 400 → 파싱 재조립 대신 Gemini가 준 parts를 그대로
   되먹이도록 수정(d42a9fa).
4. **RAG 지침이 액션을 억누름**: buildRagContext의 "[사용자 자료]에 없으면 모른다고 답하라"가 도구 카탈로그가
   있어도 액션 요청을 거절하게 만듦 → 카탈로그가 있을 때만 "액션 요청엔 도구 우선" 지침 추가(a8a8e05).
5. **날짜/지속시간 버그(Google Calendar API 직접 조회로 발견)**: "내일" 요청이 실제로 11일 뒤 날짜에,
   시작=종료(0초) 일정으로 생성됨 — LLM이 오늘 날짜를 모름 + 종료시각 필수라 모델이 start로 채움.
   매 턴 오늘 날짜(KST) 명시 + 종료시각 선택화·서버가 시작+1시간 기본값 결정론적 보정으로 수정(a8a8e05).
6. **부가 기능(사용자 요청)**: GitHub 로그인 사용자도 Google Calendar 별도 연동 가능하도록 Supabase
   Identity Linking(`linkIdentity`) 적용 — 설정 페이지에 연동 버튼 추가(a8a8e05).
7. **쿼터 소진이 "명령 이해 못함"으로 위장**: quota_exceeded를 status:"rule"로 매핑하던 Phase 8 원칙이
   액션 요청까지 덮으면서, 실제로는 llm 라우팅됐는데도 매번 rule 캔 답변만 나가 원인 파악이 어려웠음
   (routeUtterance 직접 재테스트로 로직 자체는 정상임을 먼저 확인, Vercel 런타임 로그로 200+무로그 패턴
   확인 후 특정). status:"unavailable"으로 분리해 실제 원인을 안내하도록 수정(32fe5e2).
8. **불명확한 요청에 값을 지어내 바로 실행**: 시각·제목 등을 명시하지 않아도 오리가 임의값(예: "10시")을
   채워 바로 도구를 호출함 — TOOL_PREFERENCE_GUARD에 "정보가 불명확하면 먼저 되물어라" 지침 추가(efbe9b1).

**T3 검증 통과 확인(2026-07-23, 사용자)**: 위 8건 전부 수정 반영 후 사용자가 "잘됐다"고 확인. Google
Calendar 어댑터 end-to-end(계약→토큰→라우트→승인카드→실제 Google API 반영→감사로그) 전부 실사용 검증
완료로 T3 종결. **다음 세션: T5(두 번째 어댑터) 또는 T6(Gmail, 격리) 착수** — phase_10.md Task 초안
참조해 어댑터 후보 확정(GitHub 이슈/Notion 등) 후 계약 잠금·구현.

## Phase 17 — 픽셀 오리 오피스 상호작용 — 플레이어 조작 슬라이스 (2026-07-24, `/loop` 인계)

Phase 16 웹 오피스 위에 조작·상호작용·동적배치. 순수함수는 core, STDD 검증. 상세는 phase_17.md "구현 현황".

- [x] T1 플레이어 조작: core `movePlayer`(그리드 스냅·충돌·경계) + 캔버스 포커스 게이트 키입력(방향키/WASD,
  화살표 preventDefault). 카메라 팔로우는 맵=뷰포트라 불필요. 4방향 스프라이트 이월(절차 오리+👑).
- [x] T2 상호작용: core `isAdjacent`+`describeActivity`(LLM 없이) → 근접 "E: 말 걸기" → 대화 패널.
- [x] T3 동적 레이아웃: core `deskSlots`(한 줄 최대 3) → +/− 직원 1~6명, 위치·상태 유실 없이 재배치.
- 검증: core office-play 12 tests + web build GREEN. 실기(조작 감·포커스)는 사용자 몫.

## Phase 16 — 픽셀 오리 오피스 기반 — 웹 렌더링 슬라이스 (2026-07-24, `/loop` 인계)

원설계는 apps/desktop(Tauri) 위였으나 sidecar WebSocket·hooks·스프라이트 에셋은 데스크톱/MCP 필요라
이월하고, 웹에서 완결 가능한 계약·렌더링·상호작용을 구현. 상세는 phase_16.md "구현 현황".

- [x] T2 이벤트 계약: core `office-event.ts`(officeEventSchema+parseOfficeEvents JSONL malformed 스킵). 5 tests.
- [x] T6 상태 매핑: core `eventToState`(도구→상태 데이터 테이블, 미지 도구 idle 폴백).
- [x] T4 렌더링: web `PixelOffice`(Canvas 2D 오피스, 캐릭터 바이블 색 절차적 오리, 상태 애니메이션, 유휴
  퇴근, ~11fps 캡, reduced-motion 준수). T1 결론: 자체 구현(OSS 포크 불필요, PixiJS 미도입).
- [x] T7 배치+클릭: PDCA 4오리 고정 책상 + 클릭 히트테스트 말풍선(LLM 없이). `/office` 라우트+네비.
- [x] 데모 구동: 시뮬레이터가 OfficeEvent 계약대로 이벤트 생성(실 Claude Code 이벤트는 같은 스키마로 연결).
- [x] T7 더블클릭 로그 패널(2026-07-24, `/loop` 자율): 시뮬레이터 이벤트를 bounded 로그(최근 30건,
  ring buffer)로 누적 → 캔버스 더블클릭으로 "활동 로그" 패널 토글(역할·도구·파일·오류·상대시간,
  스크롤). rAF 틱에서 setLog(상한 slice), performance.now 기준 상대시간. 검증 web tsc GREEN.
- [ ] 이월: T3 Tauri sidecar WebSocket 중계·토큰보안·스로틀링(데스크톱), T2 실 hooks/JSONL 소스, T5
  스프라이트 에셋(절차 드로잉 대체), 리소스 예산 자동 하향 실측.
- 검증: core tsc+5 tests + web build GREEN.

## Phase 15 — 뉴스 브리핑 파이프라인 — 수집·요약·리더 슬라이스 (2026-07-24, `/loop` 인계)

무인 실행 제약상 Gmail 발송·GitHub Actions 스케줄러·기기 검증 필요분은 이월하고, 코드로 완결 가능한
수집→요약→리더 수직 슬라이스 구현. 계획·이월 목록 상세는 phase_15.md "구현 현황".

- [x] T1 수집: 마이그레이션 `20260724140000_news`(feeds/articles+RLS+UNIQUE 중복차단+delete_all_my_data
  갱신+rollback) + core `news.ts`(normalizeUrl·parseRssItems RSS2.0/Atom·스키마, 6 tests) + api
  `collectFeed`(중복 23505 스킵, 연속 실패 자동 paused, SHA-256 해시, 6 tests). 본문 전문 미저장.
- [x] T2 요약: api `summarizeArticle`(Gemini 3줄, 클릭베이트 배제)+`setArticleSummary`. 수집 라우트가
  실행당 최대 8건 요약(쿼터 보호, 소진 시 부분 성공).
- [x] T6 일부: `/news` 리더(피드 추가/일시정지/삭제 + 지금 수집 + 3줄 요약 기사 목록) + `/api/news/collect` + 뉴스 탭.
- [x] T3 클러스터링(2026-07-24, `/loop` 자율): core `news-cluster.ts` — 토큰 Jaccard + union-find
  단일연결 군집화(무의존성 순수함수, 제목+스니펫 토큰화, threshold 기본 0.4). +10 tests. web
  `NewsReader`에 "관련 기사 묶기" 토글(다중 멤버 군집만 시각 그룹, 다중 군집 있을 때만 버튼 노출).
  ponytail: 형태소 분석·임베딩 없이 헤드라인 묶기 수준 — 부족하면 pgvector 임베딩으로 승격.
- [x] T7 스크랩→노트(2026-07-24, `/loop` 자율): 기사 카드 "노트로 스크랩" 버튼 → `createPage`로
  새 페이지 생성(제목=기사 제목, 본문=요약/스니펫 문단+원문 링크 문단, 아이콘 📰). BlockNote 최소
  PartialBlock 구성(서버가 plain_text 파생 → 검색·RAG에도 자동 편입). news→pages 시스템 연결.
  검증 web tsc GREEN.
- [x] T6 일부 — 기사 검색(2026-07-24, `/loop` 자율): NewsReader에 클라이언트 사이드 기사 검색
  (제목·요약·스니펫 부분일치) — 목록·군집 모두 필터 결과 기준, 결과 카운트(N/전체) 표시, 빈 결과 안내.
- [x] T6 일부 — 읽음 상태(2026-07-24, `/loop` 자율): `lib/readArticles.ts`(localStorage, 순수 `markInList`
  분리, 상한 500). 원문 링크 클릭/스크랩 시 읽음 표시 → 읽은 카드 흐리게 + "안 읽음만" 토글(읽은 기사가
  있을 때만) + "모두 읽음"(순수 `markManyInList`, 1회 저장). 순수 web. 검증 web tsc GREEN.
- [ ] 이월: T4 Gmail 발송·스케줄러, T5 발송 알림·아침 브리핑, T6 폴더·음소거·온보딩.
- 검증: core tsc+6 tests / api tsc+6 tests + web build GREEN. **db push(news) + 실기 검증(사용자).**

## Phase 14 — React Native (모바일) — 스코프+이식성 감사 (2026-07-24, `/loop` 인계)

배정 기능 항목 없음(플랫폼 포팅 단계). 이식성 감사: core/api/ai 모두 브라우저/노드 전용 참조 0건 →
RN 재사용 가능(UI 층만 새로 그림). Expo 스캐폴드·기기 검증은 무인 실행 부적합이라 사용자 참여 세션
이월(대형 의존 추가로 다른 Phase 빌드 깨질 위험 + 시뮬레이터 필요). Task 분해는 phase_14.md.

## Phase 13 — 상용 마감 (랜딩, 온보딩, 접근성, 계정) — T1~T4 코드 완료 (2026-07-24, `/loop` 인계)

계획: docs/plans/phase_13.md. 인프라 선행 없는 self-contained 순서로 T1→T2→T3→T4.

- [x] T1 온보딩 튜토리얼(원 세션, 01:00): 최초 방문 오리 안내 오버레이 + 샘플 데이터 생성, localStorage 1회.
- [x] T2 키보드 접근성: globals.css 전역 `:focus-visible` 링(--ring, shadcn ring과 비충돌) + 공용 훅
  `useModalA11y`(Esc 닫기·포커스 진입/복원·Tab 트랩)를 VersionHistory·OnboardingOverlay에 연결
  (CommandPalette는 이미 처리돼 미변경) + (app) 레이아웃 스킵 링크. 검증 web tsc GREEN.
- [x] T3 계정 데이터 파기 1단계: 마이그레이션 `20260724130000_delete_all_my_data`(security-definer 함수,
  15개 데이터 테이블 원자 삭제, profiles 보존=계정 유지) + api `deleteAllMyData`(스토리지 첨부 best-effort
  정리+RPC, +4 tests) + web `DangerZone`(설정 위험구역, `삭제합니다` 타이핑 강한 확인→삭제→로그아웃).
  **db push 필요** + 실기 검증 필요.
- [x] T4 공개 랜딩: `/welcome`(비대칭 히어로+기능 베이토+CTA 밴드, 오리 로고, design-quality 준수) +
  proxy.ts 비로그인 리다이렉트 `/login`→`/welcome`(로그인은 랜딩 CTA로) + PUBLIC_PATHS에 `/welcome`.
- [ ] T5 Sentry PII 스크러빙 — Sentry 계정 미생성이라 이월(사용자 인프라).
- [ ] T6 i18n — 범위 큼, 로드맵 후반 이월.
- 검증: core 126 / api 198 tests + web tsc·build GREEN. **db push 1건(delete_all_my_data) + 실기 검증(사용자).**

## Phase 12 — 공개 공유 + 알림 4채널 + 대시보드 — T1 코드 완료 (2026-07-24, `/loop` 자율)

착수: 로드맵 다음 순번(Phase 11 완료 후). 계획: docs/plans/phase_12.md(6항목 스코프, 슬라이스 순서).

- [x] T1 공개 페이지 공유: 페이지를 "웹에 공개"하면 `/p/<slug>`에서 **비로그인**도 읽기 전용 조회.
  - **보안 설계(핵심)**: anon 키로 pages에 공개 SELECT 정책을 열면 누구나 is_public 행을 전량
    열거(enumeration)해 타인 공개 페이지를 덤프 가능. → **security-definer RPC** `get_public_page(slug)`로
    요청한 slug 한 건만 반환(목록/열거 불가). search_path 고정, anon/authenticated에만 execute grant.
    새 env·service role 불필요(무료 원칙).
  - 마이그레이션 `20260724120000_pages_public_share`(pages에 is_public/public_slug + get_public_page 함수
    + rollback). core pageSchema에 isPublic/publicSlug(하위호환 기본값).
  - api: `publishPage`(추측 불가 랜덤 slug 발급, 멱등) / `unpublishPage`(is_public=false + slug 제거로
    링크 무효화) / `getPublicPage`(RPC 매핑). +5 tests.
  - web: BlockEditor에 `editable` prop(공개 뷰 read-only 재사용) + PageEditor "웹에 공개/링크 복사/공개
    취소" 토글 + `/p/[slug]` 라우트(`PublicPageView`, RPC 조회→read-only BlockNote) + proxy.ts
    PUBLIC_PATHS에 `/p` 추가(미들웨어 인증 게이트 통과).
  - 검증: core 135 / api 194 tests + web build·eslint(진행 중). **db push 필요(pages_public_share)** +
    **사용자 실기 검증 필요**(페이지 공개→링크 복사→시크릿창/로그아웃 상태로 열어 읽기 전용 확인,
    공개 취소 후 링크 무효 확인).
- [x] T2 방해금지 시간대(DND): 지정 시간대엔 오리가 유휴 혼잣말을 안 함(밤엔 오리도 잔다). ponytail —
  프로필 테이블/서버 없이 localStorage 저장(Tauri 위젯도 같은 배포 origin이라 web↔위젯 공유). core
  `isQuietHour`(자정 넘김 구간 처리, +3 tests) + mascot Duck에 `quietHours` prop(idle 억제, ref로 최신값
  구독) + web `lib/quietHours.ts`(localStorage+커스텀 이벤트) + `QuietHoursSetting`(설정 카드) + DuckWidget
  배선(이벤트로 즉시 반영). 다른 기기 동기화는 후속(프로필 서버 저장).
- [x] T3 헬스체크 화면: 설정 페이지 "서비스 상태" 카드가 `/api/health`를 조회해 Supabase 도달성
  (GoTrue /auth/v1/health, 5초 타임아웃) + Gemini 키 구성 상태를 표시. Gemini는 실제 호출이 무료 한도를
  소진시키므로 키 존재만 확인(핑 안 함). 스키마·계약 변경 없음. (무료 한도 실시간 소진 감지는 사용량
  추적 필요라 후속.)
- [x] T4 알림(브라우저 네이티브 채널): 오리가 레벨 업 등 주요 순간을 OS 알림으로 알린다. **T2 방해금지
  + 하루 총량 상한 준수** — core `nextDailyCount`(날짜 리셋+상한, +4 tests) + web `lib/notify.ts`
  (`notifyDuck`가 권한/방해금지(isQuietHour 재사용)/일일 상한 통과 시에만 발송) + `NotifySetting`(권한
  상태·켜기 버튼) + DuckWidget 레벨업에 배선 + 설정 카드. localStorage 저장(ponytail). 알림 히스토리
  "통합 센터"(과거 목록)는 후속.
- [x] T5 공유용 성과 카드: 오리 + 레벨/XP/먹이를 Canvas 2D로 그려 PNG로 저장(라이브러리 없음).
  DuckWidget "성과 카드" 버튼 → 모달 → 이미지 저장. duck-logo.png 같은 origin이라 캔버스 taint 없이
  toBlob 가능. 스키마·계약 변경 없음.
- [x] T6 요약 대시보드(2026-07-24, `/loop` 자율): core `dashboard.ts`(dashboardSummary 순수함수 —
  할 일 완료/미완료, 카운트 패스스루, XP→레벨 파생, +3 tests). web `/insights`(통계) 라우트 +
  `InsightsView`(listTodos/pages/memos/habits/articles/getDuckState 병렬 조회 → 집계 → 스탯 타일 7종)
  + AppNav "통계" 탭. 캐시-원본 정합성 검증(원 T6 취지)은 후속. 검증 core +3 tests·tsc + web tsc GREEN.
- **Phase 12 상태: 배정 6항목 전부 완료(T1~T6). T6 대시보드 슬라이스 추가로 마감.**

## Phase 11 — DB 뷰 (표/보드) — T1~T5 완료 (2026-07-23, `/loop` 자율)

착수: 사용자 `/loop /next-step` "현재 Phase 완료 시 다음 Phase 스코프해 Phase 17까지 진행". Phase 10은
코드 완료(남은 건 사용자 db push·OAuth 실기 검증 = 대신 못 함)라 뒤로 미루고 다음 순번 Phase 11 착수.
계획: docs/plans/phase_11.md. **설계 판단(ponytail): 데이터베이스를 새 테이블로 만들지 않고 `pages`에
얹는다** — db_schema가 설정된 페이지=데이터베이스(열+뷰), 그 자식 페이지=행, row_props=행 속성값.
행이 곧 페이지라 트리·검색·휴지통·RAG(Phase 9)를 전부 물려받는다.

- [x] T1 계약 잠금(직렬): core `database-view.ts`(propertyType/selectOption/propertyDef/viewDef/dbSchema/
  rowProps 스키마 + 순수함수 `createDefaultDbSchema`/`coerceRowPropValue`/`groupRowsByProperty`) +
  마이그레이션 `20260723110000_pages_db_view`(pages에 db_schema jsonb·row_props jsonb 컬럼 add + rollback)
  + core `pageSchema`에 dbSchema(nullable default null)/rowProps(default {}) 추가(하위호환 — 기존
  페이지·테스트 그대로 파싱) + api pages.ts 확장(`listChildPages`=행 목록, createPage/updatePage에
  rowProps/dbSchema). STDD: core +9 tests(coerce 타입별·board 그룹핑·기본스키마), api +3 tests.
- [x] T2 표 뷰: `DbTableView`(열 헤더=속성명, 행=자식 페이지, 셀 인라인 편집=`PropertyCell` 타입별
  에디터, 제목 인라인 편집+열기 버튼, "+ 새 행"). PageEditor에 "데이터베이스로 전환" 버튼(db_schema
  null일 때) + db_schema 있으면 본문 아래 `DatabaseView` 렌더 + "+ 속성"(열 추가, 이름+타입).
- [x] T3 보드 뷰: `DbBoardView`(select 속성으로 그룹된 열 + 카드 + **HTML5 드래그로 열 간 이동**, 라이브러리
  없음 + 열별 "+ 새 행"=그 그룹값 프리셋). core `groupRowsByProperty`가 옵션 순서 유지 + "없음" 그룹.
- [x] T4 속성 편집: `DbPropertyMenu`(표 헤더 클릭 팝오버) — 이름변경/타입변경/삭제 + select 옵션
  추가·제거. 삭제 시 그 속성으로 그룹하던 보드 뷰 groupBy 자동 해제. 이제 사용자가 자기 select 속성에
  옵션을 넣어 커스텀 보드 구성 가능(단 새 뷰 추가·groupBy 변경 UI는 아직 없음 — 기본 상태 보드만).
- [x] T5 code+security 리뷰(병렬 서브에이전트) + 수정: CRITICAL 0. **HIGH 3건 전부 수정** —
  (보안) createPage/updatePage가 db_schema/row_props를 zod 검증 없이 저장하던 것 → 쓰기 전
  dbSchemaSchema/rowPropsSchema.parse로 검증(잘못된 모양이 저장돼 읽기 경로 fromRow의 엄격 파싱을
  터뜨려 워크스페이스 목록 전체가 안 뜨던 자가-DoS 차단). 추가로 fromRow도 safeParse로 관대하게 —
  파싱 실패 필드만 null/{}로 강등해 목록이 항상 뜨게(이중 방어). (코드) 낙관적 업데이트 실패를 조용히
  삼키던 것 → persistRowProps/handleTitleChange/스키마편집에 catch+롤백+에러 표시, listChildPages
  실패를 "행 0개"와 구분. (코드) select→비select 타입 변경 시 보드 groupBy 미해제로 보드가 붕괴하던
  것 → handleEditProperty가 타입 변경 시에도 groupBy 해제. MEDIUM: row_props/db_schema 크기·개수
  상한(ROW_VALUE_MAX 2000/속성 50/뷰 20/행속성 200) + 입력 maxLength, 보드 onDragEnd로 하이라이트
  잔상 제거, coerceRowPropValue 숫자 공백→null. **회귀 테스트 추가**(core 135 / api 189).
  - **이월(알려진 제약)**: (MED) 속성/옵션 삭제 후 row_props 고아 키는 groupRowsByProperty가 "없음"으로
    흡수해 무해 — 명시적 정리는 후속. (MED, 추정) 같은 행 다중 셀 초고속 연타 시 전체객체 PATCH 순서
    미보장 — 개인 단일 사용자라 낮음. (LOW) 보드 카드 이동 키보드 대안 없음 — 표 뷰 select로 접근 가능.
- 검증: core 135 / api 189 tests + web build + eslint GREEN(리뷰 반영 후 재실행). **db push 필요
  (pages_db_view)** + **사용자 실기 검증 필요**(페이지→데이터베이스 전환→표/보드에서 행 추가·속성 편집·
  드래그 이동 확인).
- [x] 후속 — 필터·정렬(2026-07-24, `/loop` 자율): core `sortRows`/`filterRows` 순수함수 +
  `viewDefSchema`에 sort/filters 하위호환 확장(기존 db_schema jsonb에 없으면 null/[] 기본값 —
  **마이그레이션 불필요**). 제목·모든 속성 대상, 빈 값은 방향 무관 맨 뒤 정렬, 필터 연산자 7종
  (equals/not_equals/contains/gt/lt/is_empty/is_not_empty, 타입별 UI 노출) AND 결합. web
  `DbViewToolbar`(정렬 팝오버 + 필터 빌더, 값은 blur 커밋으로 키입력마다 저장 방지) → DatabaseView가
  `filterRows→sortRows`로 표시행 파생(원본 불변, 표·보드 공통). 뷰별 저장(다른 뷰 불변). 검증 core
  +11 tests(23 total)·tsc GREEN + web tsc GREEN.
- [x] 후속 — select 옵션 색상(2026-07-24, `/loop` 자율): core `SELECT_COLORS` 8색 팔레트(색 이름만,
  CSS 매핑은 UI). web `lib/selectColors.ts`(색→Tailwind 정적 리터럴 클래스, 미지의 색 gray 폴백,
  라이트/다크 대응). DbPropertyMenu 옵션별 색 점+스와치 피커, DbBoardView 열 헤더 색 칩, PropertyCell
  select 셀 앞 색 점. 스키마 color는 자유 문자열 유지(하위·전방호환). 검증 core·web tsc GREEN.
- [x] 후속 — 뷰 관리(2026-07-24, `/loop` 자율): "+ 뷰"로 표/보드 뷰 추가(board는 첫 select 속성으로
  자동 그룹, 없으면 표처럼 렌더, MAX_VIEWS 20 상한), "이 뷰 삭제"(최소 1개 유지), board 활성 뷰의
  "그룹 기준" select로 groupByPropId 실시간 변경. 정렬·필터가 뷰별로 저장되므로 이제 이름 붙인
  저장 뷰(여러 표/보드 + 각자의 정렬·필터·그룹)를 구성 가능. 검증 web tsc GREEN.
- [x] 후속 — 행 삭제(2026-07-24, `/loop` 자율): 표 행 hover 시 삭제 버튼, 보드 카드 hover 시 삭제 버튼.
  행=자식 페이지라 `softDeletePage`(휴지통, 복구 가능) — PageWorkspace 트리 삭제와 동일 무확인 낙관적
  패턴, 실패 시 함수형 롤백. 검증 web tsc GREEN. (행 추가만 되고 삭제 UI가 없던 기능 갭 해소.)
- [x] 후속 — CSV 내보내기(2026-07-24, `/loop` 자율): core `db-export.ts`(rowsToCsv 순수함수 — RFC 4180
  이스케이프, select=옵션명·checkbox=예/빈·number=값, +4 tests). DatabaseView "CSV" 버튼이 현재 뷰
  (필터·정렬 반영)의 행을 BOM 포함 CSV로 다운로드(엑셀 한글 대응). 검증 core +4 tests·tsc + web tsc GREEN.
- [x] 후속 — 열 표시/숨김(2026-07-24, `/loop` 자율): `viewDefSchema`에 `hiddenPropIds` 하위호환 확장(jsonb,
  마이그레이션 불필요). 표 뷰 툴바 "열" 팝오버에서 속성별 체크박스로 열 표시/숨김(뷰별 저장). board는
  열 개념이 없어 무시. **계약 변경이라 createDefaultDbSchema·api pages.test 픽스처·core 파싱 테스트의 뷰
  리터럴에 hiddenPropIds 반영 + 전 패키지 tsc 검증**(직전 sort/filters CI 회귀 교훈 적용). 검증 core 197
  tests + core/api/ai/mascot tsc + web tsc GREEN.
- [x] 후속 — 보드 카드 select 칩(2026-07-24, `/loop` 자율): 보드 카드에 select 속성값을 색 칩으로 표시
  (그룹 기준 속성은 이미 열이라 제외, 값 있는 것만). 카드 레이아웃 컬럼화(제목 행 + 칩 행). 노션 카드
  패리티. 순수 web. 검증 web tsc GREEN.
- [x] 후속 — 표 행 개수(2026-07-24, `/loop` 자율): 표 하단에 "N개 행" 표시(필터 시 표시 행 수). 순수 web.
- [ ] 후속: 필터 OR 그룹·정렬 다중키 등 고급. [이월]

## Phase 10 — AI 2단계 (에이전트 액션) — T1~T4·T7 코드 완료 (2026-07-22, `/loop` 자율)

착수 승인: 사용자 "phase 10 착수하자"(phase_10.md T0 기본값 승인). 계약 API 형태는 공식 문서 실측으로
확정(26be814). T1(외부 호출 0) → T2(승인 실행) → T3(첫 어댑터 end-to-end) 순으로 STDD 구현·검증.

- [x] 계약 API 실측(26be814): Gemini generateContent function calling 유지(Interactions API 미채택),
  functionResponse role="user", parameters=OpenAPI 3.0 서브셋, functionCall.id 병렬 매칭, Supabase
  provider_token은 최초 로그인 시점 캡처·저장 필수. 상세 phase_10.md "공식 문서 조사 결과" 절.
- [x] T1 코어 계약 잠금(2f5d155): core `agent-tool.ts` — toolDeclaration(name/description/parameters/
  kind), toolCall/toolResult(Gemini shape), AGENT_MAX_ITERATIONS, requiresApproval, **partitionToolCalls
  (카탈로그 밖 도구는 unknown 격리=인젝션/할루시네이션 방어)**. 12 tests + tsc GREEN.
- [x] T1 api 에이전트 루프(9e737f1): api `agent.ts` `runAgentTurn` — 도구 카탈로그로 Gemini 호출→
  functionCall 파싱→분류→실행→되먹임 반복(상한). readonly 자동, mutating 승인 대기 즉시 반환, unknown
  에러 회신. Adapter 인터페이스 + 목 어댑터·스크립트 fetch 7 시나리오(외부 호출 0). 7 tests + tsc GREEN.
- [x] T2 승인 게이트: api `executeApprovedCalls`(승인된 mutating만 실행, readonly/unknown은 승인 경로
  자체를 거부 — 승인 UI 우회 차단 이중 방어) + `/api/ai/agent`(서버 키+auth+레이트리밋, Phase 8 /chat
  패턴 계승, 토큰 없으면 "연동 필요" 안내) + `/api/ai/agent/approve`(zod 재검증). +9 api tests.
- [x] T3 첫 어댑터 Google Calendar(end-to-end): `createGoogleCalendarAdapter`(listUpcomingEvents readonly
  + createCalendarEvent mutating, args zod 재검증=인젝션 방어) + core `google-oauth-token` 스키마 +
  마이그레이션 `20260722080000_user_google_tokens`(RLS 4정책+rollback) + api `saveGoogleTokens`/
  `getGoogleTokens`(user_id upsert) + `auth/callback`에서 Google 로그인 시 provider_token 캡처·저장
  (refresh_token 없는 재로그인이 기존 저장분을 지우지 않도록 조회 후 보존) + LoginForm Google 버튼에
  `calendar.events` scope + `access_type=offline`+`prompt=consent`(refresh_token 발급 필수 조건, 실측).
  **db push 필요. 범위 컷: 계획 phase_10.md는 내부 `calendar_events`와 동시 반영을 언급했으나 미구현 —
  현재는 Google에만 생성, 내부 테이블 연동은 후속 Task.**
- [x] 승인 카드 UI: `packages/ai` `useAgentChat` 훅(대화 상태+승인대기+approve/cancel) + 신규
  `AgentChatPanel.tsx`(DuckChatPanel과 관심사 분리 — RAG 질답 vs 실제 액션, 홈 위젯 그리드 배치). +3 ai tests.
- [x] T4 인젝션 방어 하드닝 착수(로컬 완결 가능한 부분): `runAgentTurn`에 매 턴 고정 방어 지침(도구 실행
  결과 텍스트=데이터, 지시 아님 — 호출부 누락 방지로 한 곳에 고정) + 승인 카드가 제목뿐 아니라 시작/종료
  시각까지 전부 노출(사용자가 정확히 뭘 승인하는지 투명하게, args는 React 텍스트 렌더링이라 HTML 삽입 없음).
  **외부 텍스트(이메일 등) 구획화는 아직 해당 소스가 없어 대상 없음 — T6 Gmail 착수 시 재검토.**
- [x] T7 감사 로그: core `actionLogEntrySchema`+`summarizeForLog`(args/response 원문 대신 200자 요약,
  토큰/PII 노출 최소화) + 마이그레이션 `20260722090000_action_log`(RLS select+insert only, 불변 레코드+
  rollback) + api `logAction` + `/api/ai/agent/approve`에서 실행 결과별 기록(best-effort, 실패해도 응답
  안 막음). **db push 필요.**
- [x] code+security 리뷰(병렬) + 수정: CRITICAL 0. HIGH 2건 수정 — (1) `executeApprovedCalls`가 배치 중
  하나만 실패해도 통째로 예외를 던져 이미 성공한 결과·감사 로그가 유실되던 것 → per-call try/catch로
  격리(회귀 테스트 추가). (2) Google access_token 만료(~1시간, 갱신 미구현) 시 401→일반 502 "처리하기
  어려워요"로만 응답하던 것 → `googleCalendar.ts`가 401을 `unauthorized`로 구분해 던지고 양쪽 라우트가
  "재연동 필요" 안내로 매핑(회귀 테스트 추가). MEDIUM 1건은 mixed-turn(같은 턴에 readonly+mutating 혼재
  시 readonly 유실) ponytail 주석으로 명시(카탈로그 소규모라 현재는 낮은 우선순위, T5+ 확장 시 재검토).
  action_log id 매칭(별도 발견, 이미 수정 커밋 b61b228)은 security-reviewer도 독립 재확인.
- 검증: core 117(+4) / api 142(+4) / ai 9 tests + web build GREEN + core·api·web 로컬 full eslint 선검증.
- [x] **대화창 UX 통합(2026-07-23, 사용자 지시)**: "오리에게 시키는 건 맨위 대화창에서 자연스럽게" —
  DuckChatPanel(RAG)/AgentChatPanel(액션) 분리가 부자연스럽다는 피드백으로 단일 대화창으로 재병합.
  이전 세션이 "관심사 분리"로 일부러 나눴던 결정(2026-07-22 밤)을 사용자가 명시적으로 뒤집음.
  - core `buildRagContext`(질문 없는 RAG 컨텍스트 블록, `buildRagPrompt`가 이를 재사용하도록 리팩터).
  - api `aiChat.ts`: `answerQuestion` 제거 → `runDuckTurn`(룰 라우팅→RAG 검색→`runAgentTurn`에 컨텍스트를
    systemPrompt로 전달) 신설. Gemini `generateContent`는 tools를 줘도 필요 없으면 그냥 텍스트로 답하므로
    RAG 질답과 도구 호출이 **한 호출·한 엔드포인트**에서 자연스럽게 공존 — 별도 라우트가 불필요해짐.
  - api `agent.ts`: `NO_TOOLS_ADAPTER`(Google 미연동 시 카탈로그 0개로 순수 RAG만) 신설, `runAgentTurn`이
    카탈로그가 비면 `tools` 필드 자체를 생략(빈 functionDeclarations는 Gemini가 거부).
  - `geminiGenerate`(미사용이 된 단순 생성 헬퍼) 삭제.
  - web `/api/ai/agent`: `runDuckTurn` 기반으로 통합(토큰 없으면 NO_TOOLS_ADAPTER + 안내 systemPrompt 주입,
    쿼터 소진은 Phase 8과 동일하게 `status:"rule"`로 조용히 폴백). `/api/ai/chat` 라우트 삭제.
  - ai `useChat`+`useAgentChat` → `useDuckChat` 하나로 병합(`resolveDuckMessage` 순수함수로 rule/final/
    approval_pending/unavailable 분기).
  - web `DuckChatPanel.tsx` 1개로 병합(재인덱싱 버튼 + 승인 카드 모두 포함), `AgentChatPanel.tsx` 삭제,
    홈 대시보드 그리드에서 중복 슬롯 제거.
  - 검증: core 119 / api 141 / ai 10 tests + web build GREEN + core·api·ai·web 로컬 full eslint 선검증.
- [x] **T3 실기 검증(2026-07-23, 사용자+세션)**: Google 재로그인(신규 OAuth 클라이언트 발급 필요했음)→
  provider_token 저장→통합된 오리 대화창에서 일정 생성 시도→승인 카드→실제 Google Calendar 반영까지
  전부 확인(Google Calendar MCP로 세션이 직접 대조). `gemini-flash-latest` function calling 실동작 실측
  완료(phase_10.md 미검증 절 해소) — thoughtSignature 요구 등 실측으로만 드러난 사항 확인·반영.
  과정에서 발견·수정한 8건은 위 "T3 실기 검증 경과" 절 참조.
- [x] **인프라(사용자)**: `supabase db push` 2건 적용을 Supabase MCP(claude.ai 연결)로 직접 재확인 완료
  (2026-07-23) — 20260722080000_user_google_tokens, 20260722090000_action_log 마이그레이션 모두
  local==remote, 테이블 RLS 켜진 채 존재.
- [x] **T5 두 번째 어댑터 — GitHub 이슈**(2026-07-23, `/loop` 자율): Google Calendar와 동일 구조로 확장.
  - core `github-oauth-token.ts`(google-oauth-token.ts 동형이나 expiresAt/refreshToken 사실대로 nullable —
    GitHub OAuth App 기본 토큰은 만료도 refresh_token도 없음).
  - 마이그레이션 `20260723100000_user_github_tokens`(user_google_tokens 동형 RLS 4정책+rollback).
  - api `githubIssues.ts`: `createGitHubIssuesAdapter`(listGithubIssues readonly + createGithubIssue
    mutating, args zod 재검증, 401→unauthorized). `githubTokens.ts`(save/get, googleTokens.ts 동형).
  - **어댑터 합성**: `agent.ts`에 `composeAdapters(adapters[])` 신설 — 카탈로그를 이어붙이고 도구명으로
    올바른 어댑터에 위임(빈 배열이면 NO_TOOLS_ADAPTER). `/api/ai/agent`·`/api/ai/agent/approve`가 이제
    Google Calendar+GitHub 토큰을 각각 조회해 연동된 것만 배열에 담아 합성 — 두 서비스가 한 대화창에서
    동시에 동작(단일 어댑터 가정이던 기존 라우트를 다중 어댑터로 확장).
  - **scope 설계 판단**: GitHub 기본 로그인 버튼(LoginForm.tsx)은 이슈 쓰기 scope(`repo`)를 요청하지
    않는다(로그인용 최소 권한 유지) — Google처럼 `provider==="github"`로 자동 캡처하면 scope 없는 토큰을
    "연동됨"으로 잘못 저장하게 되므로, 설정 페이지의 별도 "GitHub 이슈 연동" 버튼(`GitHubIssuesLink.tsx`)이
    `link=github` 쿼리로 명시할 때만 콜백이 캡처하도록 분기(Google의 `provider==="github"` 자동 캡처
    분기와 다른 판단 — GitHub는 로그인 시 이 scope를 애초에 요청하지 않으므로 그 분기가 성립 안 함).
  - GitHub이 이미 주 로그인이면 `linkIdentity`(동일 provider 재연결)가 거부될 가능성이 있어(미확인)
    `signInWithOAuth` 재로그인으로 처리, 그 외엔 `linkIdentity`로 새 identity 추가. **[확인 필요, 실기
    검증 시]** — Google T3처럼 재로그인 흐름이 실제로 repo scope를 재발급하는지는 실사용으로만 확인 가능.
  - DuckChatPanel `TOOL_LABELS`에 `createGithubIssue` 라벨 추가 + `describeCall`이 owner/repo도 승인
    카드에 노출(어느 저장소인지도 승인 판단에 필요한 정보, CLAUDE.md 5절).
  - `unauthorized` 에러 응답을 어댑터별 고정 문구 대신 `error.message`(어댑터가 이미 담아 던짐) 기반으로
    일반화 — 두 어댑터가 같은 라우트를 공유하므로 어느 쪽이 만료됐는지 하드코딩된 메시지로 구분 불가능해짐.
  - code+security 리뷰(병렬) + 수정: CRITICAL 1건은 이번 diff와 무관(`.mcp.json`의 Supabase MCP
    `--read-only` 제거, 이전 세션 작업으로 추정) — 커밋 대상에서 제외해 분리. HIGH 1건 수정 —
    `githubIssues.ts` owner/repo가 URL 경로에 그대로 삽입돼 `/`·`..` 섞이면 승인 카드에 보인 대상과 실제
    요청 경로가 달라지는 confused-deputy 경로를 GitHub 명명규칙 화이트리스트(zod regex)로 차단(회귀
    테스트 추가). MEDIUM 2건 중 1건 수정 — `upstreamError`가 GitHub/Google 오류도 전부 "gemini"로
    오라벨링하던 것을 `service` 파라미터로 구분(회귀 테스트 추가), 1건은 수용 — GitHub 토큰 저장 시
    실제 부여 scope를 API로 재검증하지 않는 것은 Google 어댑터도 동일한 기존 패턴이라 이번 범위 밖으로
    유보. LOW 1건(`GitHubIssuesLink`의 signInWithOAuth 재로그인 분기가 세션을 통째로 재발급해 사용자가
    GitHub 동의 화면에서 스스로 다른 계정을 고르면 로그인 계정이 바뀌는 위험)은 개인 워크스페이스
    단일 사용자 모델이라 수용, 코드 주석으로 명시 + 실기 검증 시 재확인 항목으로 남김.
  - 검증(리뷰 반영 후 재실행): core 123(+4) / api 168(+25) / ai 10 tests + web build GREEN +
    core·api·web 로컬 full eslint 선검증(전부 clean). **db push 필요(user_github_tokens)** +
    **사용자 실기 검증 필요**(설정 페이지에서 GitHub 이슈 연동 → 오리에게 "OOO 저장소에 이슈 만들어줘"
    요청 → 승인 카드 → 실제 GitHub 반영 확인, GitHub-주로그인 재동의 흐름이 실제로 repo scope를
    재발급하는지 포함).
- [x] **T6 Gmail 어댑터**(2026-07-23, `/loop` 자율): 공식 문서(Gmail API v1 users.messages) WebFetch로
  list/get/trash 엔드포인트 실측 후 착수. Calendar/GitHub과 동일 패턴이나 두 가지 설계 판단 추가.
  - **범위 데스코프**: phase_10.md T0-6 초안의 "1시간 자동 폴링·분류/라벨"은 사용자 개입 없는 자율
    다단계 워크플로라 같은 문서 "하지 않는 것"(자율 다단계 워크플로는 차기)과 충돌 — Calendar/GitHub과
    동일하게 사용자 발화당 단순 도구 호출로 좁혀 착수(`listRecentEmails` readonly + `trashEmail`
    mutating만). 자동 폴링·분류는 후속 이월. **영구삭제는 설계상 아예 도구화하지 않음**(trash 엔드포인트만
    구현, delete 엔드포인트 없음 — CLAUDE.md 5절).
  - **토큰 테이블 분리 원칙 확립**: Calendar와 Gmail은 둘 다 Google 로그인이지만 서로 다른 scope를 별도
    시점에 동의받으므로 `user_google_tokens`를 공유하면 나중에 연동한 쪽이 먼저 것을 덮어쓴다 — GitHub과
    같은 이유로 `user_gmail_tokens`를 신설(어댑터=scope 단위로 테이블 분리, 프로바이더 단위 아님).
  - core `gmail-oauth-token.ts`(google-oauth-token.ts 동형) + 마이그레이션
    `20260723103000_user_gmail_tokens`(동형 RLS 4정책+rollback).
  - api `gmail.ts`: `createGmailAdapter` — `listRecentEmails`(list로 id만 받은 뒤 각각
    get(format=metadata)로 제목/발신자/미리보기만 채움, 본문 전체는 가져오지 않아 프롬프트에 불필요한
    외부 텍스트가 과도하게 실리는 걸 방지)/`trashEmail`(POST .../trash). T5 보안 리뷰에서 지적된
    path-injection 패턴을 선제 반영 — messageId를 영숫자/-/_ 화이트리스트로 검증(회귀 테스트 포함).
    `gmailTokens.ts`(save/get, googleTokens.ts 동형).
  - `/api/ai/agent`·`/api/ai/agent/approve`가 세 번째 어댑터로 합성(`composeAdapters`가 N개로 자연
    확장됨을 실증 — 코드 변경 없이 배열에 추가만 함).
  - web `auth/callback`에 `link=gmail` 분기(Calendar의 `link=google`과 별개 — provider는 같지만 scope와
    저장 테이블이 다름), `GmailLink.tsx`(GoogleCalendarLink.tsx와 동일 패턴, "영구삭제 안 함" 고지 포함),
    설정 페이지 카드 추가.
  - DuckChatPanel: `trashEmail` 라벨 추가 + `describeCall`이 `subject`(messageId만으론 사람이 어느
    메일인지 알 수 없어 표시 전용으로 LLM이 되돌려주는 필드)도 노출.
  - 검증: core 126(+3) / api 181(+13, gmailTokens.test.ts 5건+gmail.test.ts 8건) tests + web build
    GREEN + 로컬 full eslint 선검증. **db push 필요(user_gmail_tokens)** + **사용자 실기 검증 필요**(Gmail 연동 → "최근
    이메일 보여줘"/"OOO 메일 휴지통으로 옮겨줘" → 승인 카드 → 실제 Gmail 반영 + 영구삭제 아님을 육안
    확인).
- [ ] T6 후속: 자동 폴링·분류(데스코프됨, 에이전트 자율 워크플로 전체와 함께 재검토 대상).
- [x] **후속 — 에디터 AI 작문 보조**(2026-07-24, `/loop` 자율): 노션 격차 문서(2-4절, P1 "로드맵 공백")
  회수 — "Gemini 프록시 재사용, 신규 인프라 0". core `ai-write.ts`(buildWriteAssistPrompt 순수함수 +
  writeActionSchema, 요약/다듬기/짧게/영어/이어쓰기 5액션, +3 tests) + api `geminiGenerate`(단순 텍스트
  생성 헬퍼, 삭제됐던 것 재도입) + `assistWrite`(+3 tests) + web `/api/ai/write`(agent 라우트와 동일
  서버키+auth+레이트리밋) + `AiWriteAssistant`(PageEditor 하단 접이식 패널 — 붙여넣기→액션→결과 복사,
  BlockNote 미개조). 검증 core 200/api 214 tests + 전 패키지 tsc + web tsc GREEN.

## Phase 9 — 워크스페이스 코어 (블록 에디터) — T1·T2·T4·T5·T7 구현·배포 (2026-07-22 오후, `/loop` 자율)

착수 승인: 사용자 "백엔드 가자"(게이트 기본값 확정) + `/loop /next-step` "가능한 것 전부 구현". 계획:
docs/plans/phase_09.md. 각 슬라이스 빌드 GREEN 확인 후 main 커밋·push, CI 검증.

- [x] 백엔드/계약 층(a7a363e): DB 마이그레이션 `20260722030000_pages`(id/user_id/parent_id 계층/title/
  content jsonb/plain_text/icon/is_trashed/trashed_at + RLS 4정책 + pg_trgm GIN + rollback), core `page.ts`
  (pageSchema+extractPlainText, 7 tests), api `pages.ts`(CRUD 8 함수). **`supabase db push` 필요(미적용).**
- [x] T1 페이지 워크스페이스 UI(f6e7f36, CI success): `/pages`+`/pages/[id]` 라우트, PageWorkspace(트리
  사이드바+생성/soft삭제/네비, buildTree 재귀), PageEditor(제목+본문 디바운스 자동저장), AppNav 페이지 nav.
- [x] T2 BlockNote 에디터(f41985e, CI success): `@blocknote/core·react·shadcn` 0.52.1(React19+TW4 peer
  정합, Mantine 충돌 게이트 해소). BlockEditor.tsx(useCreateBlockNote+BlockNoteView(shadcn), html.dark
  관찰 테마 동기화, 빈 content→undefined). PageEditor textarea→next/dynamic ssr:false BlockEditor 교체.
  content 스키마 T1과 동일이라 마이그레이션 불필요.
- [x] T4 Cmd+K 검색(2206efe): api searchPages(title/plain_text ilike, pg_trgm 가속, or() 필터 인젝션 차단,
  3 tests) + CommandPalette(전역 Cmd/Ctrl+K+CustomEvent, 200ms 디바운스, ↑↓+Enter 내비) + 사이드바 트리거.
- [x] T5 휴지통/복원(a8983d0): `/pages/trash` 라우트+TrashView(listTrashed+복원+영구삭제 confirm) + 사이드바
  링크. 영구삭제는 되돌리기 불가+하위 cascade라 window.confirm(안전 규칙). **버전 히스토리는 미구현(아래).**
- [x] T7 RAG page 소스(fb6a49e, 계약 변경 병렬 밖): core embeddingSourceSchema에 'page' + 마이그레이션
  `20260722040000_embeddings_source_page`(source_type CHECK 확장+rollback). 저장→reindex(서버 plainText),
  soft delete→reindex(''), 복원→reindex(plainText), reindex-all 백필에 listPages. **`supabase db push` 필요.**
- [x] T3 파일/이미지 업로드(e2031b5): 마이그레이션 `20260722050000_page_attachments_bucket`(public 버킷
  +본인 폴더 RLS+rollback) + BlockEditor uploadFile 핸들러(본인 폴더 <uuid>.<ext>→public URL). **db push 필요.**
- [x] T6 Markdown 내보내기(308d518): BlockEditor onExportReady(blocksToMarkdownLossy, 0.52.1 동기 string)
  + PageEditor 툴바 '.md 내보내기'(제목 H1+Blob 다운로드). **백업/템플릿은 미구현(선택).**
- [x] **후속 — Markdown 가져오기**(2026-07-24, `/loop` 자율, 노션 격차 P1): BlockEditor `onImportReady`
  (tryParseMarkdownToBlocks → replaceBlocks, onChange 발화로 자동 저장) + PageEditor 툴바 '가져오기'
  (.md 파일 선택 → 본문 대체). 내보내기/가져오기 왕복 완성. 순수 web. 검증 web tsc GREEN.
- [x] T5 버전 히스토리(b288f75): 마이그레이션 `20260722060000_page_versions`(스냅샷+RLS 3정책+rollback) +
  core pageVersionSchema + api createPageVersion/listPageVersions(4 tests) + VersionHistory 모달(복원=updatePage
  +reload) + PageEditor '버전 저장'/'버전 기록'. **db push 필요.**
- [x] lint 복구(49c4426, CI success): CommandPalette 렌더 중 ref 변경 제거 + unused eslint-disable 3건 정리.
  T4~T5 CI red였던 것 복구, 로컬 full eslint 선검증. **main 전체 green 확인.**
- [x] Phase 9 전체 코드 리뷰(워크플로 5렌즈 병렬 36에이전트 + 적대적 검증) → 확정 14결함 전건 수정:
  - HIGH 5: 버전복원 vs 자동저장 레이스(복원 전 타이머 취소), page 임베딩 삭제 정리 트리거 신설
    (20260722070000, cascade 자식까지 행별 발화), handleSaved가 content까지 동기화(stale 덮어쓰기),
    extractPlainText 테이블셀/미디어캡션 순회, 언마운트 시 pending 저장 flush(페이지 전환 유실 방지).
  - MEDIUM 5: 검색 out-of-order 응답 가드, 낙관적 삭제 롤백 함수형(부활 방지), 버전복원 시 reindex,
    reindex-all 소스 라운드로빈(page 굶짐 방지), purge 임베딩=위 트리거로 해소.
  - LOW 4: 버킷 mime 화이트리스트(이미지만)+파일크기 상한, createPageVersion 서버 스냅샷(소유권 강제),
    pages RLS (select auth.uid()) initplan, safeFileName 공백만 폴백.
- 검증 총계: core 98 / api 95 / ai 6 tests + web build GREEN, 로컬 full eslint 선검증.
- [x] T6 템플릿·백업: 새 페이지 템플릿 프리셋 4종(빈/회의록/일일 노트/할 일, `+` 드롭다운 피커,
  lib/pageTemplates.ts) + 전체 백업 내보내기(활성+휴지통 페이지를 JSON 다운로드, 사이드바 하단).
  **후속(2026-07-24, `/loop`)**: 격차 문서 5.2절("내장 5~10개")대로 3종 추가(주간 회고/프로젝트 계획/
  개발 노트) — 총 7종. 개발자 워크스페이스 지향. 순수 web. 검증 web tsc GREEN.
- [x] **인프라**: `supabase db push` 5건 프로덕션 적용 완료(2026-07-22, 사용자 `npx supabase db push`).
- [x] **T8 실기 검증**(사용자): 로그인 후 에디터/검색/휴지통/페이지 RAG 동작 확인 완료(2026-07-22).
- [x] **후속 — 페이지 아이콘 이모지**(2026-07-24, `/loop` 자율): `pages.icon` 필드는 있었으나 설정 UI가
  없었음. PageEditor 제목 위 아이콘 버튼 + 큐레이션 40종 이모지 그리드 피커(라이브러리 없음, 즉시
  updatePage 저장·롤백) + "아이콘 제거". PageWorkspace 트리도 아이콘 표시(없으면 FileText 폴백).
  뉴스 스크랩(📰)과 일관. 검증 web tsc GREEN.
- [x] **후속 — 명령 팔레트(T4 확장)**(2026-07-24, `/loop` 자율): Cmd/Ctrl+K 팔레트에 빠른 동작 추가
  (새 페이지 만들기, 뉴스/오피스/설정/통계 이동) — 검색어로 액션도 필터, 액션+최근+페이지를 단일 목록으로
  통합해 ↑↓/Enter 내비게이션. 결과에 페이지 아이콘 표시. 순수 web(스키마·DB 무변경). 검증 web tsc GREEN.
- [x] **후속 — 최근 페이지(팔레트)**(2026-07-24, `/loop` 자율): `lib/recentPages.ts`(localStorage MRU 8개,
  제목/아이콘 스냅샷, 순수 `pushEntry` 분리, SSR 가드+안전 파싱). PageEditor 열람 시 기록 → 팔레트를 빈
  검색어로 열면 최근 페이지가 액션 아래 표시(빠른 재접근). 검증 web tsc GREEN.
- [x] **후속 — 단축키 도움말**(2026-07-24, `/loop` 자율): `ShortcutsHelp`(app 레이아웃 상주) — `?` 키로
  전역 단축키 목록 오버레이(입력 필드 타이핑 중엔 미가로챔). 기능이 늘어난 앱의 단축키(Cmd+K, 오피스
  WASD/E/더블클릭, Ctrl+Enter 메모 등) 발견성 향상. 순수 web. 검증 web tsc GREEN.
- [x] **후속 — 즐겨찾기**(2026-07-24, `/loop` 자율): `lib/favorites.ts`(localStorage + 커스텀 이벤트로
  같은 탭 동기화 + storage 이벤트로 다른 탭 동기화, 순수 `toggleInList` 분리, 무료 원칙 — DB/마이그레이션
  없음). PageWorkspace 트리 행에 별 토글 + 상단 "즐겨찾기" 섹션(순서 유지, 삭제된 페이지 자동 제외).
  다른 기기 동기화는 후속(프로필 서버). 검증 web tsc GREEN. **추가(2026-07-24)**: PageEditor 헤더에도
  현재 페이지 즐겨찾기 별 토글(같은 lib 구독으로 사이드바와 즉시 일관).
- [x] **후속 — 브레드크럼 내비게이션**(2026-07-24, `/loop` 자율): PageWorkspace가 현재 페이지의 상위
  체인(root→parent, 순환/누락 guard)을 계산해 PageEditor에 전달 → 제목 위에 클릭 가능한 브레드크럼
  (아이콘+제목, ChevronRight 구분). 중첩 페이지에서 상위로 빠르게 이동. 검증 web tsc GREEN.
- [x] **후속 — 페이지 복제**(2026-07-24, `/loop` 자율): 트리 행 hover 시 복제 버튼 → 제목("(사본)")·본문·
  아이콘·부모를 복사해 새 페이지 생성 후 이동. db_schema는 createPage 계약 미포함이라 데이터베이스
  페이지는 일반 페이지로 복제(알려진 제약). 검증 web tsc GREEN.
- [x] **후속 — 페이지 통계**(2026-07-24, `/loop` 자율): core `page-stats.ts`(pageStats 순수함수 — 공백 제외
  글자 수·단어 수·읽기 시간 500자/분, +5 tests). PageEditor가 편집 중 content에서 extractPlainText로
  실시간 계산해 하단에 "N자 · 약 M분" 표시. 검증 core +5 tests·tsc + web tsc GREEN.
- [x] **후속 — 오리 작성 축하**(2026-07-24, `/loop` 자율, 격차 문서 3절 P1 차별화 "노션+다마고치"): 편집 중
  글자 수 마일스톤(200/500/1000/2000/5000) 돌파 시 오리가 축하 토스트("🦆 N자 돌파!"). 초기 콘텐츠가
  이미 넘긴 마일스톤은 celebratedRef 초기값으로 제외(로드 시 오발화 방지). page-stats 재사용. 검증 web tsc GREEN.

## Phase 8 — AI 1단계 (룰 대사 → RAG Q&A) — 구현·리뷰·배포·검증 완료 (2026-07-22, `/loop` 자율+협업)

Gemini 키(`GEMINI_API_KEY`)는 배포 시 주입(Phase 4 GITHUB_TOKEN 패턴)이라 코드는 전부 빌드 가능.
커밋 48b27f9→99fda30(8건) main push 완료. 최종 검증 core 88 / api 79 / ai 6 / mascot 5 tests + next build GREEN.

- [x] 계약 잠금(직렬): core `ldd-error`(LddError)·`embedding`(768/chunkText)·`ai-chat`(routeUtterance/
  buildRagPrompt) + 마이그레이션 `20260721020000_ai_embeddings`(pgvector+embeddings RLS+match_embeddings)
  + rollback. 검증 core 88 tests·build·lint GREEN. **`supabase db push` 필요(배포 시, 사용자)**.
- [x] 슬라이스 A(a50eb2d) `packages/api`: gemini(embed/generate) + embeddings(upsert/search/indexSource/
  delete) + aiChat(answerQuestion). api 75 tests.
- [x] 슬라이스 B(2f3e4a2) `packages/ai` 신설: useChat 훅 + resolveDuckReply + reindexSource. ai 6 tests.
- [x] 슬라이스 C(769fa7f) `apps/web`: /api/ai/chat·/embed(서버 키+auth 가드+레이트리밋+zod) + DuckChatPanel +
  홈 배선. 쿼터 소진 시 route:rule 폴백.
- [x] 저장 시 임베딩 배선: Memo/Todo/Habit/Calendar 생성·수정·삭제 → reindexSource(빈 텍스트=삭제, 전 소스).
- [x] code+security 리뷰(병렬) + 수정(b6ebb00): (HIGH) indexSource 순서 반전으로 재인덱싱 실패 시 데이터
  유실 방지, embeddings DB 제약(enum/길이), searchEmbeddings safeParse, rateLimit→packages/api 이전+테스트,
  .env.example. 배포차단 0건. M2(systemInstruction)는 Phase 10 전 이월(문서화).
- [x] 기존 데이터 백필(800811b·99fda30): `/api/ai/reindex-all`(전 소스 일괄 인덱싱, 200개 상한) +
  DuckChatPanel "기존 메모·할일 인덱싱" 버튼.
- [x] 배포 인프라 반영(2026-07-22 오전, 세션이 사용자 협업으로 실행): (1) `supabase db push`로
  `20260721020000_ai_embeddings` 프로덕션 적용(dry-run 재확인 "up to date"), (2) Vercel env
  `GEMINI_API_KEY` 등록(REST API, Production+Preview) + 재배포. 키를 코드 호출 모델로 직접 실측:
  임베딩 `gemini-embedding-001` 200(outputDimensionality=768 정상), 생성 `gemini-2.5-flash` **404**.
- [x] 생성모델 버그픽스(커밋 9442fae): `gemini-2.5-flash`가 신규 키에 404("no longer available to new
  users")라 자동 최신 별칭 `gemini-flash-latest`로 교체(무료 티어 키 200 실측). api 79 tests + tsc GREEN,
  린트는 로컬 성능 이슈로 CI 위임. push→Vercel 자동배포 READY(프로덕션 별칭 web-sepia-one-88).
- **남은 사용자 몫 = ③ 하나**: 배포 사이트 로그인 → 오리 대화 패널 "기존 메모·할일 인덱싱" 1회 클릭 →
  질문 → RAG 답변 확인. (로그인 OAuth라 세션이 대신 못 함.) **+ 보안: 이 작업에 쓴 임시 Vercel 토큰은
  삭제 권장.**

**Phase 7 남은 것(사용자, 선택)**: T4 실기 검증(로그인 후 투두 완료→XP·레벨업, 습관 체크→스트릭, 뽀모도로
완료→XP, 캘린더 D-day). 기능은 이미 라이브.
재개 방법: 새 대화에서 /next-step.

## Phase 7 — 게임화 + 생산성 모듈 — 구현 완료, 마이그레이션 적용·검증 대기 (2026-07-21)

`/loop /next-step` 자율 진행. 사용자 "전부 분할·병렬" 승인. 상세·리뷰·알려진 한계는 phase_07.md.

- [x] 계약 잠금(직렬, 커밋 39d23d0): core 게임화/생산성 도메인+순수함수(69 tests) + DB 마이그레이션 4개 + duckState XP api
- [x] 병렬 4슬라이스(서브에이전트): 습관 / 뽀모도로 / 캘린더 / 게임화 UI(각 api+위젯, disjoint 파일 경계)
- [x] 통합(직렬): index/page 배선 + xpSignal(XP→오리 갱신) + 투두 XP + DuckWidget 구독·레벨업 celebrate
- [x] 검증: core 69 / api 59 / mascot 5 tests, 전 build, apps/web lint+build. code+security 리뷰 배포차단 0건
- [x] 마이그레이션 적용: 신규 4테이블 `supabase db push` 프로덕션 적용 완료(2026-07-21, 사용자 승인)
- [ ] T4 실기 검증(사용자, 선택 — 기능은 라이브)
- 반영: (L-2) 뽀모도로 재완료 XP 이중지급 DB 차단. 이월(알려진 한계): 서버 권위 XP(M-1/M-2/M-3/L-1,
  솔로 자기치팅·타 사용자 무피해)는 소셜 기능 전 선결로 문서화.
- [x] 후속 — TodoWidget 완료 숨기기(2026-07-24, `/loop` 자율): "완료 숨기기/완료 표시(N)" 토글(완료 항목이
  있을 때만 노출). "N개 남음" 배지는 항상 미완료 기준으로 정확 유지. 순수 web. 검증 web tsc GREEN.
- [x] 후속 — MemoWidget 검색(2026-07-24, `/loop` 자율): 메모가 5개 초과일 때 검색창 노출, 내용 부분일치
  필터 + 무결과 안내. 순수 web. 검증 web tsc GREEN.

## Phase 6 — 오리 2단계 (상태 반응·자율 행동·활보 모드) — 완료 (T4 사용자 검증 완료, 2026-07-21)

`/loop /next-step` 자율 진행. 계약 잠금: 상태 반응 = **클라이언트 파생**(DB 없음, 사용자 승인),
범위 = T1+T2+T3 전부(사용자 승인). 상세·판단근거는 docs/plans/phase_06.md.

- [x] T1 상태 반응 — core `deriveDuckMood`/`daysSinceLastCommit`(순수함수, 13개 테스트) + mascot Duck
      `mood` prop(자세로 표현, aria-label) + `TodoWidget`→`DuckWidget` CustomEvent 배선(`todoSignal.ts`,
      `useDuckMood`). 몸통 색은 캐릭터 바이블 고정값이라 불변.
- [x] T2 자율 행동 — 상시 idle bob(useFrame) + 유휴 12~24초 혼잣말(mascot `pickIdlePhrase`, mood별
      문구) + reduced-motion 준수(흔들림만 끄고 자세·텍스트 유지).
- [x] T3 활보 모드 — Tauri `walker` 창(투명·클릭통과·always-on-top·기본 숨김) + Rust
      `set_walking_mode` 커맨드(`set_ignore_cursor_events`는 옵션 A 특성상 Rust에서 설정) + `/walker`
      라우트(투명 배경·CSS 걷기) + 데스크톱 전용 `WalkingModeToggle`. 권한 `allow-set-walking-mode`.
- [ ] T4 검증 — 머신 검증(core 48/mascot 5 tests, cargo fmt/clippy/test, lint) 완료. **사용자 실기
      검증 대기**: 투두 완료→happy, 커밋 공백→sad, 유휴 혼잣말, 활보 오버레이(배포 후) 클릭통과.
      절차는 phase_06.md "T4 검증 상태".

**부수(Phase 6 무관, T1 작업 중 필요)**: `@ldd/mascot`이 `DuckMood` 타입을 쓰려고 `@ldd/core`를
의존에 추가(`workspace:*`) — pnpm install로 재링크.

## Phase 5 종료 (2026-07-21)

- T0~T4 전부 완료. T4 실사용 검증 중 인프라 결함 다수 발견·해소(로그인 CSP 2건, GITHUB_TOKEN
  미등록, 잔디 색, activity_daily 테이블 프로덕션 미적용) — 사용자가 위젯 로그인으로 activity_daily
  반영까지 확인. 상세는 docs/plans/phase_05.md T4 절, docs/History.md 2026-07-21 16:00 기록.
- DETECT 리뷰: 6차원 병렬 + 적대적 검증(39개 서브에이전트). **SEC- 배포차단 0건.** 확정 30건 전부
  REF-MEDIUM(6)/REF-LOW(24). REF-MEDIUM 6건 수정(Rust async 커맨드·순수함수 회귀테스트,
  activity updated_at·테스트 인자검증 강화, CSP 문서정정). 잔여 REF-LOW는 phase_06.md 착수조건/
  후속 하드닝으로 이월. 전문은 docs/reviews/2026-07-21-phase5.md(immutable).

**노션 격차 분석 지시서 작성 (2026-07-21)**: docs/plans/notion-gap-analysis-2026-07-21.md —
노션 2025 대비 26축 격차 매트릭스, 차별화 전략, 기술 부채 상환표(P0/P1/P2), 로드맵 정합 결정
(Phase 순서 유지, Phase 9 = "워크스페이스 코어" 재정의, 하드닝 Phase 신설 안 함). **Phase 6 착수
조건은 이 지시서 7절의 "Phase 6 전" P1 항목 전건**(Toast/Spinner, activity.ts 3건, Rust symlink,
커버리지 측정, SEC-04, Supabase keepalive) — phase_06.md 작성 시 서두에 반영할 것. 함께 적용된
P0 문서 수정: CLAUDE.md 불일치 정정(static export/Tauri Release/8절), DECISIONS.md 5절 재검토
기록(미배정 5건 회수), ARCHITECTURE.md 5절 blocks 검토 표기.

## Phase 5 블로커 — 전부 해소 (2026-07-21)

1. ~~Rust 툴체인 미설치~~ → **해소(2026-07-21)** — 사용자 요청으로 이 세션이 rustup + VS Build
   Tools 2022(C++ 워크로드) 설치 진행. 중간에 네트워크 단절로 멈췄다가 재시작, 강제종료 여파로
   Windows Installer 뮤텍스 충돌(에러 1618)이 났으나 재시도로 자연 해소(재부팅 불필요).
   `cargo new` + `cargo build`로 실제 MSVC 컴파일 성공까지 확인 — 툴체인 완전 동작 검증됨.
   (`vswhere`의 `isComplete`는 여전히 false로 나오나 실제 컴파일이 되므로 무시 가능 [추정: 상태
   캐시 갱신 지연].)
2. ~~아키텍처 결정 필요~~ → **해소(2026-07-20)** — 옵션 A(배포된 웹 URL을 Tauri WebView가 그대로
   로드) 확정, ARCHITECTURE.md 1절 + DECISIONS.md #9-11 갱신 완료.

**T3 완료(2026-07-21, `/loop` 자동 진행)**: `supabase/migrations/20260721000000_activity_daily.sql`
+ down 스크립트 추가. 실제 `supabase db push` 적용은 사용자 확인 후(supabase/README.md 참조).

**T1 완료(2026-07-21, `/next-step`)**: `apps/desktop` Tauri 2 스캐폴딩 — WebView가 Vercel 배포
URL을 로드(옵션 A), always-on-top 위젯 창(360x640), `cargo build` 전체 컴파일 성공. 상세와 판단
근거(패키지 스크립트명을 `tauri:build`로 바꿔 CI `pnpm build`와의 충돌을 피한 이유 포함)는
docs/plans/phase_05.md T1 절 참조. **빌드된 앱을 실행해 프로세스 생존은 확인했으나, 위젯 창이
실제로 화면에 렌더링되는지는 이 세션 환경에서 시각적으로 확인하지 못함** — 사용자가 직접
`pnpm --filter desktop tauri:dev`로 확인 권장.

**부수 발견 및 수정(Phase 5와 무관, T1 작업 중 발견)**: `apps/web`이 `zod`를 소스에서 직접 import
(`api/github/contributions/route.ts`, Phase 4)하면서도 `package.json`에 의존성으로 선언한 적이
없었다 — 그동안 `packages/core`를 통해 우연히 node_modules에서 해석되던 phantom dependency였다.
이번 세션의 `pnpm install`(desktop용 `@tauri-apps/cli` 추가)이 워크스페이스를 다시 링크하면서
그 우연한 해석이 깨져 루트 `pnpm build`가 실패하는 것을 발견 — `apps/web/package.json`에 `zod`를
명시적 의존성으로 추가해 해소, 재빌드로 확인. main에 이미 잠재해 있던 버그라 CI가 같은 이유로
아무 때나 깨질 수 있었던 상태였음.

**T2 완료(2026-07-21, `/next-step`)**: Rust `collect_claude_logs`(파일 내용은 안 읽고 mtime만으로
날짜 판정 — DECISIONS.md #9-2보다 보수적) + `collector://progress` 이벤트. Rust는 Supabase에 직접
접속하지 않고 로컬 집계만 반환 — 실제 업로드는 이미 로그인된 WebView 쪽에서 새로 만든
`packages/api`의 `upsertActivityDaily`가 수행(Rust 바이너리에 Supabase 자격 증명 불필요). 배포된
Vercel origin에는 `capabilities/remote.json` + `permissions/default.toml`로 `collect_claude_logs`
커맨드와 이벤트 리스닝만 최소 권한 부여. `apps/web`은 `window.__TAURI__`(withGlobalTauri) 존재
여부로 데스크톱 실행을 감지해 자동 동기화(`DesktopCollectorSync`, 브라우저에서는 no-op). 상세는
docs/plans/phase_05.md T2 절 참조. `cargo build` + 전체 `pnpm build`/`lint`/`test`(5/5, 9/9, 8/8)
통과 — **단, 실제 로그인 상태로 실행해 activity_daily에 데이터가 실제로 쌓이는지는 end-to-end로
확인 못함**(GUI 시각 확인 불가, T1과 동일 한계) — T4에서 사용자 확인 필요.

**T1/T2 code-reviewer + security-reviewer 병렬 리뷰 및 후속 수정(2026-07-21)**: T4 진행 전 방어적으로
실행. HIGH 4건 발견, 전부 이 세션에서 수정:
- (보안) `capabilities/remote.json`의 origin 스코핑이 옵션 A 구조(frontendDist=배포 URL)에서는
  Tauri가 이 origin을 "Local"로 판정해 사실상 무효라는 걸 설치된 tauri 크레이트 소스로 확인
  — 구조적 한계라 되돌리지 않고 DECISIONS.md #9-11 + phase_05.md에 정확히 기록
- (보안) `security.csp: null`도 원격 https 콘텐츠엔 무효, `apps/web`에 보안 헤더가 전혀 없던 것도
  함께 확인 — `apps/web/src/proxy.ts`에 CSP+5개 보안 헤더 추가(실제 응답에 반영되는지 curl로
  실측 확인, Next.js가 요청 헤더에도 CSP를 같이 실어야 최종 응답까지 전달한다는 함정도 실측으로 발견)
- (코드) Rust `collector/mod.rs`가 UTC 기준으로 날짜를 매겨 KST 자정 근처 작업이 하루 밀려
  집계되던 버그 — `time::UtcOffset::current_local_offset()`(실패 시 UTC 대체)로 수정
- (코드) Rust 쪽 단위 테스트 0건이던 것 — `session_date`/`find_session_files` 등 5개 테스트 추가,
  `cargo test` 통과
- MEDIUM/LOW(심볼릭 링크 미검증, `updated_at` 미갱신, 동기화 실패 무알림 등)는 이번 라운드에서
  고치지 않고 phase_05.md에 후속 과제로 남김(사용자에게 HIGH만 우선 처리하기로 확인받음)
- 수정 후 전체 `pnpm build`/`lint`/`test` 재실행 — 5/5, 9/9, 8/8 재확인

**T4 부분 검증(2026-07-21, `/next-step`)**: T1/T2가 이미 커밋(`d2f8f4c`)돼 있어 build/lint/test
전체 재확인(5/5, 9/9, 8/8) 후 `cargo test`(5/5)까지 통과 확인. 이어서 `pnpm --filter desktop
tauri:dev`로 위젯을 실제로 기동 — 이전 세션들이 "이 에이전트 세션엔 상호작용 가능한 desktop/window
station이 없을 가능성"이라 추정했던 것과 달리, 이 세션은 `SessionId=1`(Console,
`UserInteractive=True`)의 실제 인터랙티브 데스크톱에서 동작 중이었다. `Get-Process`로 창 핸들이
0이 아님(`4067222`), 타이틀 정상(`Little Dev Duck`), `Responding=True`, WebView2 자식 프로세스가
배포 URL을 DNS로 실제 조회한 기록까지 확인 — 위젯 창 렌더링 자체는 실측 검증됨. 픽셀 스크린샷은
백신이 PowerShell의 화면 캡처 패턴을 악성으로 오탐해 차단, 우회하지 않고 프로세스 레벨 증거로
갈음. 검증 후 프로세스 정리(`Stop-Process`)함. 나머지 T4 2항목(activity_daily 반영, 웹-위젯 데이터
일치)은 실제 Google/GitHub 로그인이 있어야 하는 영역이라 이 세션이 대신할 수 없음 — 사용자 검증
절차는 docs/plans/phase_05.md T4 절에 기록.

**참고**: 이 저장소에는 git worktree가 없어 다른 세션과 같은 폴더를 공유한다. 2026-07-20 21시경
gstack browse 데몬이 다른 프로세스와 락 경합을 일으켰고(무한 대기, 강제 해제하지 않음), 로컬 3000
포트도 "unknown process"가 점유 중이었음 — 다른 세션이 동시에 활성 상태였을 가능성이 높다
[추정, 실측 안 됨]. 이 세션은 Phase 3/4 관련 파일만 건드렸고 다른 세션의 산출물은 건드리지 않았다.

## Phase 2 — 투두 + 메모 위젯 — 완료 (2026-07-20)

- [x] T1 packages/api CRUD 계약 (listTodos/createTodo/updateTodo/deleteTodo, 메모 동일) — 13개 테스트 통과
- [x] T2 투두 위젯 (오늘 필터, 낙관적 업데이트, 빈/에러/로딩 상태) + 인라인 수정 기능(피드백 반영, 커밋 588ea4b)
- [x] T3 메모 위젯 — 스티커노트 방식으로 재설계(피드백 반영, 커밋 588ea4b), title 자동 유도로 저장 실패
      버그 해결
- [x] T4 홈 화면을 위젯 대시보드로 교체

배포: https://web-sepia-one-88.vercel.app. 실사용 중 발견된 버그(메모 저장 실패)와 그에 대한 수정
(커밋 588ea4b)으로 형식적 클릭 검증을 갈음, Phase 2 종결. 상세는 History.md 2026-07-20 16:34 기록.
추가로 zod datetime 스키마가 Postgres 타임스탬프 포맷을 거부하던 core 전역 버그도 이후 발견·수정됨
(커밋 41a9de7, Phase 특정 아님).

## Phase 3 — 오리 1단계 (GLB, 클릭 반응, 말풍선) — 완료 (2026-07-20)

- [x] T1 packages/mascot 패키지 신설(Duck 컴포넌트, 클릭 squish + 말풍선, code-reviewer HIGH 2건 수정)
- [x] T2 홈 화면 연결(next/dynamic ssr:false)
- [x] T3 검증 — build/lint/test 통과. 사용자 클릭 검증은 다른 세션에서 완료된 것으로 간주하고 종료
      처리(사용자 지시, 2026-07-20 21:56). 이 세션은 DETECT 리뷰만 별도 실행 —
      docs/reviews/2026-07-20-phase3.md(신규 이슈 없음).

model.glb 미확보로 도형 플레이스홀더로 구현(사용자 승인됨, DuckModel 부분만 교체하면 되도록 분리,
아직 미교체). 커밋 3b34286. 상세는 History.md 2026-07-20 20:00, 21:56 기록.

## Phase 4 — GitHub 커밋 잔디 — 구현 완료, 배포 후 사용자 검증 대기 (2026-07-20)

- [x] T1 packages/core `contributionDaySchema`/`contributionSummarySchema`
- [x] T2 packages/api `fetchGithubContributions` (GraphQL 클라이언트, 목 fetch로 5개 테스트)
- [x] T3 `GET /api/github/contributions` — 세션의 GitHub 로그인명은 `user.identities[].identity_data`
      에서만 읽음(코드리뷰에서 `user_metadata` 위조 가능성 HIGH 지적 받아 교체), 30분 TTL 캐시,
      서버 로깅, `force-dynamic` 명시
- [x] T4 `GithubContributionWidget` — 로딩/에러/미연동/잔디그리드 4상태, 홈 대시보드 연결
- [x] T5 검증 — code-reviewer + security-reviewer 병렬 리뷰(HIGH 1건·MEDIUM 3건 수정, MEDIUM 1건은
      의도적 보류 — apps/web에 vitest 인프라 없음), 전 패키지 build/lint/test 통과

상세는 docs/plans/phase_04.md, DECISIONS.md #9-3(스코프 조사 결과) 참조.

## Phase 4 검증 체크리스트 (배포 후 사용자 실행, docs/plans/phase_04.md T5)

1. Vercel 환경변수에 `GITHUB_TOKEN`(scope 없는 PAT) 등록되어 있는지 확인
2. GitHub 계정으로 로그인 → 홈 화면에 GitHub 잔디(컨트리뷰션 캘린더)가 표시되는지
3. Google 계정으로 로그인한 경우 "GitHub 계정으로 로그인하면..." 안내가 뜨는지(에러 아님)

## 그 외 진행 (Phase 무관 UI 전면 리디자인, 2026-07-22, 사용자 요청) — 커밋·배포 완료

- 사용자 "UI 개선 - 대시보드로 예쁘게"(참조: ui.watermelon.sh, cult-ui.com). **Tailwind v4 도입은
  확정 스택 변경이라 사용자에게 물어 명시 승인 후 진행**(게이트 통과). apps/web에 Tailwind v4 +
  shadcn 규약 + framer-motion/lucide 설치, globals.css를 단일 색 출처로 재작성(Geist 폰트 실적용,
  기존 Arial 폴백 버그 수정), UI 프리미티브 신설(components/ui/*), 홈을 헤더+베이토 그리드 대시보드로
  재구성, 위젯 8종 + 로그인 리스타일(로직·E2E data-testid 보존).
- 팔레트: 화이트 + **머스타드 옐로우**(--primary #ca8a04, 다크 #eab308). GitHub 잔디는 진짜 초록
  스케일(--gh-0..4, 강도↑=진한 초록). lucide 1.x Github 아이콘 제거 → 인라인 SVG 대체.
- 검증: `pnpm --filter web build` GREEN. 미리보기 Artifact(claude.ai/code/artifact/228c0a22).
  Figma는 Starter 플랜 MCP 한도로 빈 파일만 생성.
- **상태 정정(2026-07-22, `/loop` 자율 확인)**: 위 "미커밋/커밋 대기"는 이후 사실과 다름 — 리디자인은
  main에 **커밋·배포 완료**(e495bd8)됐고, 후속으로 사이드바 네비 + 설정/관리자 페이지(abd3814)까지
  확장됨. 현재 작업 트리 clean(미커밋 리디자인 없음).
- 상세: docs/History.md 2026-07-22 항목.

## 그 외 진행 (Phase와 무관한 브랜딩 변경, 2026-07-20, 사용자 요청)

- 사이트 테마 accent 토큰을 올리브(#A99C65)에서 앤트로픽 스타일 오렌지(#D97757)로 변경
  (`packages/ui/src/tokens.ts`+`tokens.css`). WCAG AA 대비 재검증 통과(`tokens.test.ts` 8개 전부 통과,
  스냅샷 갱신). **오리 자체 렌더링 색상(CHARACTER.md 고정값)은 변경하지 않음** — DECISIONS.md 4절에
  분리 기록.
- 로그인 페이지(`/login`)에 사용자가 제공한 오리 로고 이미지 추가(`apps/web/public/duck-logo.png`,
  `next/image`로 렌더링). 브라우저 시각 확인은 gstack browse 데몬이 다른 세션과 락 경합으로 실패해
  못 함 — build만 통과 확인, **실제 렌더링 미검증**.

## 그 외 대기
- 별도 트랙: Meshy에서 model.glb 다운로드 — Phase 3은 이미 도형 플레이스홀더로 구현됐으므로, 받는 대로
  packages/mascot/src/Duck.tsx의 DuckModel 부분만 useGLTF 로드로 교체(재작업 없음, 커밋 3b34286에서
  분리해둔 지점)
- Sentry 연동 [미해결, 이월]
- **신규 기능 백로그 처리 완료 (2026-07-20)**: `docs/plans/2026-07-20-1st_Fut_list.md`(사용자 작성) 기반으로
  `docs/FEATURES.md`(146개 항목), `docs/CONSTRAINTS_FREE_TIER.md`, `docs/ARCHITECTURE_DIAGRAMS.md`,
  `docs/plans/phase-mapping-proposal-2026-07-20.md`(85개 항목 → Phase 매핑, **사용자 승인 완료**)를 생성.
  로드맵에 Phase 15(뉴스 브리핑)/16·17(픽셀 오리 오피스) 신규 추가(docs/ARCHITECTURE.md 6절 갱신).
  상세 Task 분해 초안 `docs/plans/phase_15.md`, `phase_16.md`, `phase_17.md`도 작성 완료 — 단, 각 Task
  분해 자체의 착수는 **별도 승인 필요**(각 문서 "착수 조건" 참조), 그리고 로드맵상 Phase 3~14가
  먼저 진행돼야 순서가 온다. Phase 2 진행분에는 아무 항목도 추가하지 않음(검증 완료).
