# Phase 3 — 오리 1단계 (GLB, 클릭 반응, 말풍선)

작성일 2026-07-20. 착수 전 확인된 블로커: Meshy에서 받은 `model.glb`가 아직 저장소에
없음(ducky-mascot repo TODO에도 미완료로 남아 있음). 사용자 승인: GLB가 준비될 때까지
플레이스홀더 도형으로 먼저 구현하고, GLB가 오면 교체한다.

## 완료 정의

- 홈 화면에 3D 오리가 렌더링된다 (지금은 GLB 대신 캐릭터 바이블 색상·비율을 맞춘
  기본 도형 플레이스홀더).
- 오리를 클릭하면 시각적 반응(찌그러짐 바운스)과 말풍선 문구가 나타난다.
- `docs/CHARACTER.md`(ducky-mascot repo)의 고정 외형 값(색상)을 그대로 사용한다 —
  임의 변경 금지 조항을 따름.

## Task

### T1. packages/mascot 패키지 신설 — 완료
- [x] `Duck` 컴포넌트: react-three-fiber + drei로 렌더링. body/head/beak/물갈퀴/안경/눈/
      정수리 깃털을 기본 도형(sphere/cone/torus/box)으로 구성, 색상은 CHARACTER.md 실측값
      (#F6EFDD, #A99C65, #352116) 그대로 사용.
- [x] 클릭 시 squish 애니메이션(useFrame으로 스케일 감쇠, 별도 애니메이션 라이브러리
      추가 없이 구현) + 말풍선(Html) 2초 노출.
- [x] 말풍선 문구 선택 로직(`pickPhrase`)은 순수 함수로 분리해 vitest로 단위 테스트.
- STDD: phrases.test.ts 3케이스(첫 문구, 순환, 음수 인덱스 방어) 작성 후 구현.

### T2. 홈 화면 연결
- [ ] apps/web 홈 위젯 대시보드에 Duck을 추가. r3f Canvas는 SSR 환경에서 렌더 불가하므로
      `next/dynamic`으로 `{ ssr: false }` 동적 임포트.

### T3. 검증
- [ ] 전 패키지 build/lint/test 통과.
- [ ] 실제 로그인 세션에서의 렌더링·클릭 반응은 인증 세션이 필요해 자동화 불가 —
      사용자 클릭 검증 대기 (Phase 2와 동일한 제약).

## 하지 않는 것 (이번 Phase 제외)

- 실제 GLB 로딩(useGLTF) — model.glb 확보 후 별도 Task로 교체.
- 오리 감정 상태머신, XP/먹이/코스튬 연동 — Phase 7 이후 범위. duck_state 테이블은
  이번 Phase에서 건드리지 않는다(YAGNI — Phase 3은 정적 반응만 필요).
- 말풍선 대사에 AI(Gemini) 연동 — Phase 8 이후 범위. 지금은 순수 canned phrase.

## 리스크

- GLB 부재로 인한 임시 플레이스홀더 — 상용 배포 전 반드시 실물 GLB로 교체 필요.
  ducky-mascot repo의 TODO(GLB 다운로드)가 선행 조건.
- r3f/three는 이 저장소에 처음 추가되는 의존성 — 번들 크기 영향 확인 필요(웹 성능 예산
  체크 항목으로 이월).
