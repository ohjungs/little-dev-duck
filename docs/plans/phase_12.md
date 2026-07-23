# Phase 12 — 공개 공유 + 알림 4채널 + 대시보드

착수 예정: Phase 11 완료 후 `/loop` 자율(사용자 "Phase 17까지 진행"). 로드맵 다음 순번.
phase-mapping-proposal 2절에 배정된 6항목:
1. 알림 통합 센터 + 하루 알림 총량 상한 (D)
2. 리포트 수치 검증(캐시-원본 정합성) (D)
3. 공유용 성과 카드 생성(오리가 성과를 든 이미지) (E)
4. 방해금지 시간대(밤에는 오리도 자고 알림 정지) (G)
5. 헬스체크 화면(Supabase·Gemini·피드 상태) (G)
6. 공개 발행 필터(개인정보 유출 방지 검사) (J)

## 슬라이스 순서 (자체 완결성·외부 의존 적은 것 우선 = ponytail)

### T1 공개 페이지 공유 (self-contained, 최우선) — [x] 코드 완료 2026-07-24
노션식 "웹에 공개". 페이지를 공개로 표시하면 `/p/[slug]`에서 **비로그인**도 읽기 전용 조회.
- **보안 설계(핵심)**: anon 키로 `pages`에 공개 SELECT 정책을 열면 누구나 `is_public=true` 행을
  전량 열거(enumeration)해 타인 공개 페이지를 덤프할 수 있다. service_role 클라이언트는 없음(새 env
  필요 = 사용자 몫, 무료 원칙상 회피). → **security-definer RPC** `get_public_page(slug)`로 해결:
  함수가 정의자 권한으로 실행돼 RLS를 우회하되 **요청한 slug 한 건만** 반환(목록/열거 불가). anon은
  `supabase.rpc('get_public_page', { slug })`로만 접근. is_public=false면 null.
- slug는 추측 불가한 랜덤(예: base62 22자). 공유=링크를 아는 사람만.
- 마이그레이션: pages에 `is_public boolean default false` + `public_slug text unique`(nullable) +
  `get_public_page(text)` security-definer 함수(is_public 행만, RLS 우회) + rollback.
- core: pageSchema에 isPublic/publicSlug 추가(하위호환 기본값).
- api: `publishPage(id)`(is_public=true + slug 생성) / `unpublishPage(id)` / `getPublicPage(slug)`(rpc).
- web: PageEditor "웹에 공개" 토글(공개 시 링크 복사) + `/p/[slug]` 공개 라우트(read-only 렌더,
  BlockNote 읽기 전용 + DB 뷰는 후속). 6번(공개 발행 필터)을 여기 결합: 공개 전 확인 문구.

### T2 방해금지 시간대 (DND, self-contained)
profiles(또는 신규 settings)에 quiet_hours(시작/종료 시각). 오리 자율 혼잣말·알림을 그 시간대엔 정지.
현재 알림은 오리 idle 혼잣말(mascot)뿐이라 그 억제부터. 알림 4채널은 T4에서.

### T3 헬스체크 화면 (self-contained)
설정/관리자 페이지에 서비스 상태 카드: Supabase(간단 select 1), Gemini(키 존재·핑), 무료 한도 감지.
`/api/health` 라우트(서버에서 각 핑, 캐시). 외부 의존 최소.

### T4 알림 통합 센터 + 총량 상한 (뒤 — 인프라 큼)
4채널(위젯 토스트/브라우저 Notification/이메일/...) 통합 센터 + 하루 총량 상한. 브라우저 Notification
API는 무료·네이티브라 우선, 이메일은 기존 Gmail 어댑터 재사용 검토. 규모 커서 후순위.

### T5 공유용 성과 카드 이미지 (뒤 — 이미지 생성)
오리가 성과를 든 이미지 생성. Canvas 렌더 or 정적 합성. 무료 범위 확인 후.

### T6 리포트 수치 검증 (대시보드와 함께)
통계 대시보드의 캐시-원본 정합성 검사. 대시보드 구현 시점에 결합.

## 안전·계약 메모
- 공개 공유는 **개인정보 유출 경로**라 보안 리뷰 필수(공개 전 확인 UI + 열거 방지 RPC).
- 모든 마이그레이션 down 동반. security-definer 함수는 `search_path` 고정 등 정의자 권한 남용 방지.
- 착수 시 계약(pageSchema 필드 추가)은 병렬 구간 밖에서. 기존 페이지 하위호환 기본값.
