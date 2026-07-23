# Phase 14 — React Native (모바일)

착수 스코프: 2026-07-24 `/loop` 인계 세션(사용자 "Phase 17까지 진행"). phase-mapping-proposal에서
Phase 14는 **신규 배정 기능 항목 없음** — 새 기능이 아니라 기존 워크스페이스를 모바일로 포팅하는
플랫폼 단계다(CLAUDE.md: "모바일: React Native, 최종 단계, core/api/ai만 공유").

## 이 세션이 한 것 (스코프 + 이식성 감사)

**공유 패키지 이식성 감사(2026-07-24)** — RN에서 `@ldd/core`·`@ldd/api`·`@ldd/ai`를 그대로 쓸 수
있는지 실측:
- `packages/core`: `window`/`document`/`localStorage`/`next`/`react-dom`/`fs`/`path` 참조 **0건** —
  순수 TS(zod+순수함수). RN 이식 가능. [확인됨]
- `packages/ai`: 브라우저 전용(`window`/`document`/`next`/`react-dom`) 참조 **0건**. 훅은 React라
  RN에서도 동작(react-native가 react를 공유). [확인됨]
- `packages/api`: `next`/`fs`/`path`/`process.env` 직접 참조 **0건** — SupabaseClient를 주입받는
  순수함수 설계(웹 라우트가 env를 읽어 주입)라 RN에서 `@supabase/supabase-js`로 클라이언트만 만들어
  주면 그대로 재사용 가능. [확인됨]

결론: 의존 방향(apps → ui/mascot/ai → api → core)이 이미 플랫폼 중립이라 **공유 층은 추가 리팩터
없이 RN 앱에서 소비 가능**. UI 층(`packages/ui`, `apps/web` 컴포넌트)만 RN용으로 새로 그리면 된다.

## 왜 이 세션에서 앱 자체는 만들지 않았나 (정직한 이월)

무인 `/loop` 실행 환경의 한계로 **Expo 앱 스캐폴드와 실제 빌드는 사용자 참여 세션으로 이월**한다:
- Expo/RN 도입은 pnpm 워크스페이스에 대형 의존 트리(react-native, metro, expo, 네이티브 모듈)를
  추가한다 — 무인 상태에서 잘못 얹으면 다른 Phase의 web build/turbo 파이프라인을 깨뜨릴 위험이 크다
  (공유 폴더·병렬 세션 환경에선 특히). 스택은 확정됐지만 **도입 시점은 다른 개발이 멈춘 뒤가 안전**.
- RN은 시뮬레이터/실기기 없이는 렌더링·네비게이션·인증 리다이렉트를 검증할 수 없다 — "빌드는 되는데
  화면이 안 뜬다"를 무인으로 잡을 수 없다(Phase 5 Tauri에서 겪은 GUI 검증 한계와 동형).

## Task 분해 (툴체인 준비 후 착수)

- [ ] T1 Expo 앱 스캐폴드: `apps/mobile`(Expo Router + TS), pnpm 워크스페이스 등록, metro가
      `@ldd/*` 심볼릭 링크를 따라가도록 `metro.config.js`(watchFolders + nodeModulesPaths) 설정.
- [ ] T2 인증: `@supabase/supabase-js` + `expo-auth-session`(OAuth Google/GitHub) + `expo-secure-store`
      로 세션 저장. 웹의 `auth/callback` 대응 딥링크 흐름.
- [ ] T3 공유 데이터 층 배선: `@ldd/api`의 todos/memos/pages CRUD를 RN에서 그대로 호출(감사에서
      이식 확인됨) — SupabaseClient만 RN용으로 생성해 주입.
- [ ] T4 핵심 화면(읽기 우선): 위젯 대시보드(할 일·메모·커밋 잔디), 오리(2D 폴백 — 3D r3f는 RN에서
      별도 검토), 페이지 목록·읽기. 편집은 후속.
- [ ] T5 오리 마스코트 RN: react-three-fiber/expo-gl 검토 또는 Lottie/스프라이트 2D 폴백(성능·번들
      트레이드오프는 실기기 측정 후 결정 — ponytail: 2D부터).
- [ ] T6 푸시 알림(expo-notifications)로 Phase 12 알림 채널을 모바일까지 확장.

## 안전·계약 메모
- core/api/ai 계약은 이미 잠겨 있고 플랫폼 중립임이 감사로 확인됨 — RN 착수 시 계약 변경 불필요(있다면
  병렬 구간 밖에서).
- Expo 도입은 확정 스택(CLAUDE.md 2절)이라 사고 게이트 재통과 불필요하나, 워크스페이스 대형 의존
  추가라 **다른 Phase 개발이 멈춘 시점에, 사용자 참여로** 진행 권장.
