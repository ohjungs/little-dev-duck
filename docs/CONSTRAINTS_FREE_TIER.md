# 무료 티어 제약사항 (Free Tier Constraints)

> **무료 운영 원칙** (docs/plans/2026-07-20-1st_Fut_list.md 참조): 유료 전환 불가.
> 한도 수치는 각 서비스가 수시로 조정하므로, 착수 시점에 반드시 공식 문서를 재확인할 것.

본 문서는 LDD가 사용하는 무료 서비스 5종(Supabase, Gemini API, Vercel, GitHub Actions, Gmail API)의
2026-07-20 기준 웹 조사 결과를 정리한 것이다. 각 항목은 [확인됨](공식 문서 직접 인용) / [추정](자료 간 편차 또는 비공식 출처)을
구분해 표기했다.

---

## 1. Supabase Free Plan

| 항목 | 한도 | 출처 | 확인일 |
|---|---|---|---|
| 비활성 프로젝트 자동 일시정지(pause) | [확인됨] 활동 낮은 상태 7일 경과 시 자동 pause. 대시보드에서 90일 이내 'Resume project'로 복구 가능(데이터/설정 보존). 90일 경과 후 처리는 문서에 명시 없음 [추정: 영구 삭제 가능성] | https://supabase.com/docs/guides/platform/free-project-pausing | 2026-07-20 |
| Postgres DB 용량 | [확인됨] 500 MB(실제 DB 크기 기준, 디스크 자체는 1GB 제공) | https://supabase.com/pricing | 2026-07-20 |
| 월간 대역폭(Egress) | [확인됨] 총 10GB (Egress 5GB + Cached Egress 5GB) | https://supabase.com/pricing | 2026-07-20 |
| Storage 용량 | [확인됨] 1GB, 파일당 최대 업로드 50MB | https://supabase.com/pricing | 2026-07-20 |
| Auth MAU | [확인됨] 50,000 MAU(Third-Party Auth MAU 포함) | https://supabase.com/pricing | 2026-07-20 |
| Realtime 동시 연결 | [확인됨] 피크 동시 연결 200개, 월간 메시지 200만 건, 메시지당 최대 256KB | https://supabase.com/pricing | 2026-07-20 |
| Edge Function 호출 | [확인됨] 월 500,000회 | https://supabase.com/pricing | 2026-07-20 |
| 활성 프로젝트 개수 | [확인됨] Organization당 활성 프로젝트 2개까지 무료(pause된 프로젝트는 미포함) | https://supabase.com/pricing | 2026-07-20 |

**한도 초과 시 동작**
- DB 용량(500MB) 초과: 읽기 전용(read-only) 전환, INSERT/UPDATE 거부, SELECT는 계속 동작.
- Storage(1GB) 초과: 신규 업로드 차단(기존 파일 유지, 읽기 가능). 유예기간 1회 제공.
- Egress(10GB) 초과: Fair Use Policy로 전체 서비스 제한, API가 HTTP 402 반환. 다음 결제 주기 시작 시 자동 해제.
- Auth MAU(50,000) 초과: 신규 가입 거부. 기존 세션 영향은 [추정, 미확인].
- Realtime 연결(200) 초과: 초과분 신규 연결 거부.
- Edge Function 호출(500,000) 초과: [추정] 동일한 Fair Use 체계로 유예 후 402 제한 가능성.
- 공통: 80% 도달 시 결제 이메일로 경고 → 유예기간 → 미해소 시 항목별 제한. 비활성 pause는 사용량과 무관한 별도 정책.

**LDD 대응책**
- 비활성 7일 pause 방지: GitHub Actions로 주 1~2회 실제 DB 쿼리(ping/insert) 실행하는 keepalive 워크플로 구성.
- DB 500MB 상한 + pgvector 임베딩 저장량: 초기 개발 단계에서 가장 먼저 부딪힐 가능성이 높은 항목이므로, 임베딩 차원/보관 정책을 설계 단계에서 산정.
- Storage/Egress: 파일 업로드 크기 제한 및 캐싱 정책으로 방어.

---

## 2. Google Gemini API — 무료 티어

| 항목 | 한도 | 출처 | 확인일 |
|---|---|---|---|
| Gemini 2.5 Flash RPM | [추정] 약 10~15 RPM (2025-12-07 축소 이슈 전후로 자료 편차) | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |
| Gemini 2.5 Flash RPD | [추정] 250~1,500 RPD (자료 간 편차 큼, 안전 마진은 하한값 250 권장) | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |
| Gemini 2.5 Flash TPM(input) | [추정] 250,000~1,000,000 TPM | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |
| Gemini 2.5 Flash-Lite RPM/TPM/RPD | [추정] 15~30 RPM, TPM 250,000~1,000,000, RPD 1,000~1,500 | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |
| Gemini 2.0 Flash RPM/TPM | [추정] 5~15 RPM, TPM 250,000~1,000,000 (구세대, 신규 연동은 2.5 계열 권장) | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |
| 임베딩 API 별도 한도 | [확인됨] 텍스트 생성 모델과 별도 한도 체계, 무료 사용 가능. [추정] 구체 수치 RPM 5~100, RPD 100~1,500 | https://ai.google.dev/gemini-api/docs/pricing | 2026-07-20 |
| 집계 단위 | [확인됨] API 키가 아닌 Google Cloud 프로젝트 단위, RPM/TPM/RPD 동시 평가, RPD는 태평양시간(PT) 자정 초기화 | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |
| 2025-12-07 한도 축소 이벤트 | [추정, 미검증] 3rd-party 보고 기준 사전 공지 없이 약 50~80% 축소, 공식 changelog 미확인 | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-07-20 |

**한도 초과 시 동작**
- [확인됨] RPM/TPM/RPD 중 하나라도 초과 시 HTTP 429 + `RESOURCE_EXHAUSTED`. 지수 백오프 재시도 권장.
- 지속적으로 상위 한도가 필요하면 결제 계정 연결 후 유료 티어(Tier 1/2/3)로 전환 필요(Free→Tier 1은 즉시).

**LDD 대응책**
- 실제 적용 한도는 공식 문서가 로그인+동적 렌더링 표에 의존해 자동 수집이 어려우므로, 키 발급 전 https://aistudio.google.com/rate-limit 에서 실측 재확인.
- 일일 한도(RPD) 초과 방지: `llm_usage` 카운터 테이블로 프로젝트 단위 호출량을 추적하고, 임계치 근접 시 캐시된 응답을 우선 반환.
- RAG 대화(사용자 상호작용형)는 RPM이 병목이 되기 쉬우므로 최소치(RPM 10) 기준으로 설계하고 클라이언트에 요청 큐잉/디바운스 적용.
- 뉴스 요약 등 배치성 짧은 호출은 2.5 Flash-Lite로 분리해 한도 여유 확보.
- 대량 임베딩(pgvector 채우기)은 초기 적재 시 소규모 배치로 나눠 429 발생 여부를 실측하며 진행.

---

## 3. Vercel Hobby Plan

| 항목 | 한도 | 출처 | 확인일 |
|---|---|---|---|
| Cron Jobs 개수 | [확인됨] 프로젝트당 최대 100개 | https://vercel.com/docs/cron-jobs/usage-and-pricing | 2026-07-20 |
| Cron 최소 실행 주기 | [확인됨] 하루 1회가 최소 간격(그보다 잦은 표현식은 배포 실패). 실행 시각도 ±59분 오차, UTC 고정 | https://vercel.com/docs/cron-jobs/usage-and-pricing | 2026-07-20 |
| 함수 최대 실행시간 | [확인됨] Fluid Compute(신규 프로젝트 기본) 기준 Hobby 기본=최대 300초, 확장 불가. 구프로젝트(2025-04-23 이전, Fluid 미사용)는 기본 10초/최대 60초 | https://vercel.com/docs/functions/limitations | 2026-07-20 |
| 함수 월간 사용량 | [확인됨] Invocations 월 100만 건 / Active CPU 월 4 CPU-hrs / Provisioned Memory 월 360 GB-hrs / 메모리 2GB·1vCPU 고정 / 동시성 최대 30,000 | https://vercel.com/docs/limits | 2026-07-20 |
| 대역폭 | [확인됨] Fast Data Transfer 월 100GB, Fast Origin Transfer 월 10GB, Edge Requests 월 100만 건 | https://vercel.com/docs/plans/hobby | 2026-07-20 |
| 상업적 이용 제한 | [확인됨] 비상업적 개인 용도로만 제한. 결제 처리, 유료 광고, 후원 요청 등 포함 시 Pro 이상 필요 | https://vercel.com/docs/limits/fair-use-guidelines | 2026-07-20 |

**한도 초과 시 동작**
- 사용량형 한도(Invocations, CPU, Memory, Data Transfer 등) 초과: 자동 과금 없이 해당 기능 일시 정지, 원칙적으로 30일 후 재사용 가능(일부는 유예 더 짧음).
- Cron 최소 주기 위반: 런타임이 아닌 배포 자체가 실패(빌드 타임 검증).
- 함수 실행시간(maxDuration) 초과: 504 `FUNCTION_INVOCATION_TIMEOUT`.
- 배포 횟수(하루 100회) 초과: 그날 남은 시간 배포 차단, 다음 날 리셋.
- 상업적 이용 위반: 계정 경고 또는 비활성화(약관 위반 처리).

**LDD 대응책**
- Vercel Hobby Cron이 하루 1회로 부족한 경우 GitHub Actions `schedule`(최소 5분 간격, public repo 무료)로 API Route를 HTTP POST 호출하도록 대체.
- LDD가 결제/광고/후원 요소 없는 개인 프로젝트임을 유지해 상업적 이용 제한을 준수(추가로 확인 필요: 결제 유도·광고 배너·제휴링크·후원 버튼 부재).
- 신규 프로젝트는 Fluid Compute 활성화 여부를 대시보드에서 확인해 300초 한도를 전제로 설계.

---

## 4. GitHub Actions

| 항목 | 한도 | 출처 | 확인일 |
|---|---|---|---|
| Public 저장소 실행 분 | [확인됨] 표준 GitHub-hosted 러너 사용 시 요금제 무관 완전 무료·무제한(2,000분/월은 private 전용). Larger runner는 public도 유료 | https://docs.github.com/en/actions/concepts/billing-and-usage | 2026-07-20 |
| Public 무료 정책 | [확인됨] Free 플랜에 'Free for public repositories' 명시 | https://github.com/pricing | 2026-07-20 |
| Scheduled workflow(cron) 최소 간격 | [확인됨] 최소 5분 간격. 부하 높은 시간대는 트리거 지연/드롭 가능 | https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows | 2026-07-20 |
| 동시 실행 job 수 | [확인됨] Free 20개 / Pro 40개 / Team 60개 / Enterprise 500개(초과분은 큐잉) | https://docs.github.com/en/actions/reference/limits | 2026-07-20 |
| 워크플로 트리거 레이트리밋 | [확인됨] 저장소당 10초에 1,500개 이벤트. GITHUB_TOKEN은 저장소당 시간당 1,000 요청 | https://docs.github.com/en/actions/reference/limits | 2026-07-20 |
| 무료 사용량 초과 시 과금 여부 | [확인됨] Public+표준 러너는 상한 자체 없음. private/large runner 등 포함 한도 초과분은 Actions spending limit(기본 $0) 설정에 좌우 | https://docs.github.com/en/actions/concepts/billing-and-usage | 2026-07-20 |
| 2026년 가격 정책 변경 | [확인됨] 2026-01-01부터 분당 단가 최대 39% 인하(무료 쿼터 불변). self-hosted 러너 분당 과금 도입은 연기됨 | https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/ | 2026-07-20 |

**한도 초과 시 동작**
- LDD는 public 모노레포이므로 표준 러너 기준 '분' 한도 자체가 없어 유료 전환 시나리오 발생하지 않음.
- 실질적 제약: (a) 계정 전체 동시 실행 job 20개(Free) — 초과분은 과금 아닌 큐잉/대기, (b) cron 최소 5분 간격, (c) 트리거 API 레이트리밋(10초당 1,500건/저장소).
- private repo 병행 또는 large runner 사용 시에만 2,000분/월 쿼터 적용, 초과분은 spending limit(기본 $0)에 따라 차단 또는 과금.

**LDD 대응책**
- Vercel Cron 부족분을 GitHub Actions `schedule`로 대체할 때 최소 5분 간격 제약을 감안해 설계.
- lint/test/build를 다수 job으로 병렬 쪼갤 계획이라면 Free 플랜 동시 실행 20개 한도를 고려.
- self-hosted 러너 사용 계획이 있다면 과금 정책 재공지 여부를 향후 재확인.

---

## 5. Gmail API

| 항목 | 한도 | 출처 | 확인일 |
|---|---|---|---|
| Quota Units (2026-05-01 이후 신규 프로젝트) | [확인됨] 분당 프로젝트 전체 1,200,000 units, 분당 사용자당 6,000 units. `messages.send`/`drafts.send` 호출당 100 units(사용자 1명 기준 분당 최대 약 60건). 프로젝트 일일 임계값 80,000,000 units(증액 불가) | https://developers.google.com/workspace/gmail/api/reference/quota | 2026-07-20 |
| Gmail 계정 자체 발송 한도 | [확인됨] 개인 계정 하루 최대 500통, 1통당 수신자 최대 500명. API로 보내도 동일 적용 | https://support.google.com/mail/answer/22839 | 2026-07-20 |
| OAuth 게시 상태 영향 | [확인됨] Quota Units 자체는 게시 상태 무관. Testing 상태는 테스트 사용자 100명 제한 + refresh token이 7일 후 자동 만료. Production 전환 시 7일 만료는 사라지나 sensitive scope 검증 필요(단, 본인/소수 전용 앱은 검증 예외 가능성) | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification | 2026-07-20 |
| `gmail.send` 스코프 분류 | [확인됨] Restricted가 아닌 Sensitive scope로 분류(Restricted는 gmail.readonly/compose/insert/modify/metadata 등). CASA 보안심사는 Restricted scope 대상만 필요 | https://developers.google.com/workspace/gmail/api/auth/scopes | 2026-07-20 |
| Restricted scope 검증 정책(참고) | [확인됨] Restricted scope로 제3자 서버 경유 시 사용자 수 무관 CASA 심사 필요. Testing 게시 상태는 검증 자체 불필요 | https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification | 2026-07-20 |

**한도 초과 시 동작**
- Quota Units 초과: 429/403(`rateLimitExceeded`, `userRateLimitExceeded`) 반환, 지수 백오프 재시도 권장. 프로젝트 일일 8천만 units 초과분은 현재 무료이나 2026년 하반기 과금 예고([확인됨] 임계값 자체 / [추정] 실제 시행 여부·시점, 최소 90일 사전고지 예정).
- Gmail 계정 하루 500통 한도 초과: 발송 실패, 통상 1~24시간 후 재시도 가능.
- OAuth Testing 상태에서 refresh token 7일 만료: `invalid_grant` 오류로 재인증 필요(발송 한도 문제가 아닌 토큰 만료 문제).

**LDD 대응책**
- LDD 사용 패턴(본인 계정, 하루 1~2통)은 모든 정량 한도에 압도적 여유 — 별도 카운터 불필요.
- OAuth consent screen을 Testing으로 둘지 Production(개인 예외 적용)으로 둘지 결정하고, refresh token 저장/갱신(7일 만료 대응) 전략을 Task 문서에 명시.
- 향후 수신 메일함 읽기 기능(gmail.readonly/modify) 추가 시 Restricted scope로 전환되어 CASA 연례 보안심사가 새로 발생함을 사전 인지.
- 영구삭제는 CLAUDE.md 5절에 따라 설계상 금지(휴지통 이동만, 사용자 승인 후) — 본 조사와 별개로 기존 안전 규칙 유지.

---

## 조사 방법 및 한계

- WebSearch로 1차 수집 후 공식 출처(supabase.com, ai.google.dev, vercel.com, docs.github.com, developers.google.com)를 WebFetch로 직접 재확인.
- Gemini API의 구체적 RPM/TPM/RPD 수치는 공식 문서가 로그인+동적 렌더링 표에 의존해 자동 수집이 불가능했고, 2026년 1~4월 게시된 다수 3rd-party 기술 블로그를 교차 대조한 범위값으로 제시했다(신뢰도 낮음, 실제 적용 전 재확인 필수).
- 서드파티 요약본(예: Supabase 대역폭 '2GB' 표기)이 공식 문서와 불일치하는 사례가 있었으므로, 공식 문서를 항상 우선했다.
- 본 문서의 모든 수치는 서비스 정책 변경에 따라 언제든 바뀔 수 있다. 실제 구현 착수 전 각 공식 문서 링크를 재방문해 재확인할 것.
