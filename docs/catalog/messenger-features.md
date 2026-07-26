# LDD 메신저 모듈 — 기능 전수 카탈로그 + 중복 대조

> 원본은 사용자가 2026-07-26에 작성해 준 734항목 카탈로그다(`## 원본` 절에 **한 글자도 고치지 않고** 보존).
> 이 문서가 더하는 것은 **중복 대조**다 — 734개 중 **이미 있는 것 / 이미 계획된 것 / 진짜 새 것**을
> 코드로 확인해 갈랐다. 그게 없으면 **이미 있는 것을 다시 만든다**(CLAUDE.md 3-5절 최고 심각도).
>
> **2026-07-26 갱신 — 734항목 전부가 Phase에 배정됐다.** 처음에는 Group 0~2만 계획하고
> Group 3·4는 카탈로그 보관으로 뒀는데, 사용자가 **"전부 계획값으로"** 요청해 전수 배정했다.
> 배정 결과는 **[messenger-assignment.md](messenger-assignment.md)** — 코드로 생성했고
> **누락·중복·유령 ID를 0으로 검증**했다.
>
> 실행 계획: [Phase 50](../plans/phase_50.md)(Group 0) · [Phase 51](../plans/phase_51.md)(Group 1) ·
> [Phase 52](../plans/phase_52.md)(Group 2) · [53](../plans/phase_53.md) 그룹방·연락처 ·
> [54](../plans/phase_54.md) 메시지 심화 · [55](../plans/phase_55.md) 검색·보관·미디어 ·
> [56](../plans/phase_56.md) 알림·설정 · [57](../plans/phase_57.md) 접근성·플랫폼 ·
> [58](../plans/phase_58.md) 운영·보안·인증 · [59](../plans/phase_59.md) 마스코트·에이전트 ·
> [60](../plans/phase_60.md) 보류 항목의 **해제 전제**.

---

## 1. 대조 결과 요약 (코드로 확인)

원본의 Group 0(성립 최소 세트) **34개를 하나씩 코드와 대조**했다.

| 판정 | 개수 | 뜻 |
|---|---|---|
| ✅ **이미 있다** | **14** | 코드에 있다. **다시 만들면 인벤토리 위반** |
| 📋 **이미 계획됐다** | **6** | Phase 41~49에 있다. 메신저 때문에 다시 계획하지 않는다 |
| 🆕 **진짜 새 것** | **14** | 메신저의 실제 신규 작업 |

**즉 Group 0의 34개 중 20개(59%)가 이미 있거나 계획돼 있다.**
남은 14개가 [Phase 50](../plans/phase_50.md)의 실제 범위다.

### 1-1. ✅ 이미 있는 것 (14) — 다시 만들지 않는다

| 항목 | 어디에 | 근거 |
|---|---|---|
| A-003 로그아웃 | `AppNav.tsx:197` | `/auth/logout` POST 폼 |
| A-004 세션 자동 갱신 | `@supabase/ssr` | 프레임워크가 한다 |
| **B-004 실시간 메시지 수신 (Realtime 구독)** | **`lib/realtime.ts` + `20260724190000_realtime_publication.sql`** | **`subscribeTable`이 이미 있고 위젯 5개가 쓴다** |
| C-003 나와의 채팅 | 개념상 `DuckChatPanel` | 오리와의 1:1이 이미 그 자리 |
| U-001 RLS 정책 (모든 테이블) | 18개 테이블 전부 | `schemaGuard`가 검사까지 한다 |
| U-002 참여자만 조회 | RLS `user_id` 패턴 | 14개 테이블이 이미 이 방식 |
| U-003 본인만 수정·삭제 | RLS | 동일 |
| U-004 스토리지 버킷 정책 | `20260722050000_page_attachments_bucket.sql` | **전례가 있다** |
| U-006 service_role 클라이언트 노출 금지 | Phase 35 | **테스트가 유입을 잡는다** |
| V-001 자동 일시정지 회피 핑 | `/api/keepalive` | 상한까지 붙어 있다 |
| V-002 핑 스케줄러 | Vercel Cron | 동작 중 |
| V-013 마이그레이션 관리·롤백 | `supabase/migrations` + `rollback/` | down 전건 있음 |
| V-014 DDL 전 사용자 확인 | CLAUDE.md 5절 | 규범으로 박혀 있음 |
| G-019 전송 실패 로그 | `action_log` + `LddError` | 로그 체계 있음 |

**가장 큰 발견: B-004(Realtime)가 이미 있다.**
원본이 MUST로 잡은 실시간 수신 기반이 `subscribeTable` 한 함수로 이미 존재하고
publication 마이그레이션까지 적용돼 있다. **메신저는 여기에 테이블만 얹으면 된다.**

### 1-2. 📋 이미 계획된 것 (6) — 메신저가 다시 계획하지 않는다

| 항목 | 어느 Phase | 비고 |
|---|---|---|
| A-001 이메일 가입 | [41](../plans/phase_41.md) | **원본 A-001~A-005·A-008·A-009가 Phase 41과 정확히 같다** |
| A-002 이메일 로그인 | [41](../plans/phase_41.md) | |
| A-005 세션 만료 처리 | [41](../plans/phase_41.md) | T5 |
| B-001 웹 클라이언트 | 있음 | |
| B-002 Tauri 데스크톱 | 있음 | 확정 스택 |
| V-003·V-004 용량 모니터링 | [49](../plans/phase_49.md) T1 | 설정 → 저장소 사용량 |

### 1-3. 🆕 진짜 새 것 (14) = [Phase 50](../plans/phase_50.md)의 범위

`rooms` · `room_members` · `messages` · `attachments` 테이블과 그 위의 UI다.

C-001·C-002 / E-001~E-007 / F-001·F-004 / G-001~G-004·G-006·G-025 / H-001·H-002 / I-001~I-003.

---

## 2. 이 카탈로그의 전제를 다시 확인한다

### 2-1. S2(나 + AI 오리 에이전트 다수)가 맞다 — 그리고 이미 절반 있다

원본이 S2를 기본 축으로 고른 판단이 옳다. **그리고 그 축의 핵심이 이미 구현돼 있다:**

[`DuckChatPanel.tsx`](../../apps/web/src/components/DuckChatPanel.tsx)가
`messages` · `role === "user"` · `pendingApproval` · `send` · `approve` · `clear`를 갖는
**완전한 1:1 에이전트 채팅**이다. 원본의 R 섹션 MUST 4개(R-001·R-002·R-003·R-018)가 여기 있다.

> **따라서 메신저의 정확한 정의는 "새 채팅을 만드는 것"이 아니라
> "이미 있는 오리 채팅을 방(room) 개념으로 일반화하고 메시지를 영속화하는 것"이다.**

이 프레이밍이 중요하다. 새로 만들면 오리 채팅이 **두 벌**이 되고,
이 저장소가 반복해서 데인 것이 정확히 그것이다([Phase 32](../plans/phase_32.md)·[36](../plans/phase_36.md)).

**[확인 필요] `DuckChatPanel`의 메시지가 영속되는가.** `clear()`가 있고 테이블이 없으므로
**[추정] 메모리에만 있다.** 그렇다면 영속화가 Phase 50의 실제 값이고,
**부수 효과로 오리 대화가 새로고침 후에도 남는다**(지금은 사라진다) — 그 자체로 개선이다.

### 2-2. 무료 티어 제약 — 원본이 지적한 2개 중 1개는 이미 해결됐다

| 원본 지적 | 실제 상태 |
|---|---|
| **7일 무활동 자동 일시정지** | ✅ **이미 막고 있다** — `/api/keepalive` + Vercel Cron이 동작 중. 원본의 V-001·V-002가 이미 있다 |
| **스토리지 1GB** | ⚠ **유효한 위험.** 지금은 페이지 표지·첨부만 쓰는데 메시지 사진이 들어오면 빠르게 찬다 |

**추가로 이 저장소가 이미 아는 제약**: `PENDING.md` 6번 —
**호출 상한·캐시가 전부 서버 인스턴스 메모리에 산다.** Vercel이 인스턴스를 여럿 띄우면
메신저의 rate limit(G-016·U-011)도 그만큼 느슨하다. **원본에 없는 제약이라 여기 추가한다.**

### 2-3. 원본의 데이터 모델 스케치 검증 결과

원본 4절이 `[가정]`으로 제시한 스키마를 **기존 마이그레이션과 대조했다**:

| 원본 제안 | 실제 |
|---|---|
| `profiles`: id, display_name, avatar_url, status_message, last_seen_at | **`20260720100000_profiles.sql`에 앞 3개가 이미 있다.** `status_message`·`last_seen_at`은 없다 → 추가 필요 |
| `rooms` · `room_members` · `messages` · `attachments` · `reactions` | **전부 없다** → 신규 |
| `agents`: id, name, persona_prompt, tool_scopes, enabled | 없다. 다만 오피스에 `OFFICE_ROLES`가 있어 **역할 개념이 이미 있다** → [Phase 48](../plans/phase_48.md)과 통합 검토 |

**원본의 핵심 제약 3개는 그대로 채택한다** — 판단이 정확하다:
1. `client_msg_id` 유니크로 중복 전송 차단
2. `seq`는 서버가 부여(클라이언트 시계 불신)
3. `deleted_at` 소프트 삭제

특히 (2)는 이 저장소가 **날짜·시간대 문제로 여러 번 데인 이력**과 정확히 맞물린다.

---

## 3. 판정을 바꾼 항목 (원본 대비)

원본의 등급을 **이 저장소의 실제 상태에 근거해** 조정한 것만 적는다.

| 항목 | 원본 | 조정 | 근거 |
|---|---|---|---|
| B-004 실시간 수신 | MUST | **MUST(이미 있음)** | `subscribeTable` + publication 존재 |
| V-001·V-002 핑 | MUST | **MUST(이미 있음)** | `/api/keepalive` 동작 중 |
| U-032 의존성 취약점 스캔 | DEFER | **완료** | [Phase 39](../plans/phase_39.md)가 CI 게이트로 만들었다 |
| L-024 커맨드 팔레트 | DEFER | **이미 있음** | `CommandPalette.tsx`(Cmd+K) |
| L-013 의미 검색 (pgvector) | DEFER | **기반 있음** | RAG가 pgvector를 이미 쓴다 |
| Q-013·Q-014 백업·복원 | SHOULD | **이미 있음** | `Export/ImportDataButton` (형식 v4, localStorage 포함) |
| Q-020 전체 데이터 삭제 | SHOULD | **이미 있음** | `delete_all_my_data` RPC(14테이블) + `DangerZone` |
| M-010 방해 금지 시간대 | SHOULD | **이미 있음** | `QuietHoursSetting.tsx` |
| M-012 집중 모드 연동 | DEFER | **이미 있음** | `FOCUS_MODE_KEY` — `DuckWidget`이 이미 알림을 억제한다 |
| D-030 뽀모도로 상태 자동 전환 | SHOULD | **기반 있음** | 같은 플래그 |
| T-016 단축키 목록 | DEFER | **이미 있음** | `ShortcutsHelp.tsx` |
| U-011 rate limit | SHOULD | **이미 있음(한계 있음)** | `allowRequest` — 인스턴스 메모리 한계 |
| U-013·U-014 보안 헤더·CSP | SHOULD/DEFER | **이미 있음** | nonce CSP + [Phase 38](../Status.md) 정적 프리렌더 가드 |
| A-010 계정 삭제 | SHOULD | **구현됨(꺼짐)** | [Phase 35](../plans/phase_35.md) — env var 대기 |
| **X-018 IME Enter 오작동 방지** | SHOULD | **MUST로 승격** | 한글 입력에서 조합 중 Enter는 **전송이 아니라 확정**이다. 안 막으면 한국어 사용자가 문장을 반토막으로 보낸다. 우리 사용자는 한국어가 기본이다 |
| M-002 데스크톱 네이티브 알림 | SHOULD | **[Phase 44](../plans/phase_44.md)와 통합** | 뽀모도로 알림이 같은 `Notification` 배선을 만든다 — 두 벌로 만들지 않는다 |
| Y-013~Y-015 오피스 연계 | DEFER | **[Phase 48](../plans/phase_48.md)과 통합** | 오피스 직원 = 에이전트. 말풍선·직원별 대화가 이미 그 Phase에 있다 |
| C-026~C-028 에이전트 목록·역할·토글 | SHOULD | **[Phase 48](../plans/phase_48.md)과 통합** | `OFFICE_ROLES`가 이미 역할 개념을 갖는다 |
| P 섹션 전체 (통화) | DEFER | **DEFER 유지 + 사유 보강** | 원본 판단이 정확하다. TURN 서버가 사실상 유료 |
| Z 섹션 전체 (결제) | SKIP | **SKIP 유지** | 동의 |

---

## 4. 원본 (사용자 작성 — 한 글자도 고치지 않음)

> 아래는 사용자가 준 카탈로그 전문이다. 위 대조표와 어긋나면 **대조표가 최신**이고
> 원본은 요구의 정본이다.

원본 전문은 `messenger-features-original.md`에 분리 보관한다
(이 문서가 대조·판정을 담고, 원본은 변경 없이 남기기 위해서다).
