# Spec: Phase C — 모바일 터치 컨트롤 (2026-07-24)

> Status: DRAFT — `/spec-loop` 승인 대기

## 동기

현재 오피스는 키보드 전용. 모바일에서 플레이 불가능.
가상 D-pad + 탭 상호작용으로 터치 디바이스 완전 지원 필요.

## 수용 기준 (AC)

### AC-1: 입력 추상화 레이어
- [ ] `apps/web/src/lib/office-input.ts` 생성
- [ ] InputManager 클래스: bindKeyboard, bindTouch
- [ ] InputAction: up/down/left/right/interact/menu/cancel
- [ ] isPressed(매 프레임 폴링), isJustPressed, consumeJustPressed
- [ ] lastTapWorld() — 탭 위치 월드좌표 변환
- [ ] endFrame() 프레임 리셋

### AC-2: 가상 D-pad 오버레이
- [ ] `apps/web/src/components/VirtualDpad.tsx` 생성
- [ ] 좌측: 방향 4버튼 십자 배치
- [ ] 우측: A 버튼 (상호작용, E키 대체)
- [ ] 터치 중 반복 이동 (150ms 간격)
- [ ] 키보드 감지 시 자동 숨김
- [ ] touch-action: none으로 스크롤 방지
- [ ] 최소 44px 터치 타겟 (WCAG 2.5.8)
- [ ] 반투명 디자인, 게임 화면 방해 최소화

### AC-3: 탭-투-인터랙트
- [ ] NPC 직접 탭 → 상호작용 (E키 불필요)
- [ ] screenToWorld로 탭 위치 변환
- [ ] 인접 NPC 탐색 → 대화 시작
- [ ] 비인접 탭 → 이동 없음 (나중에 pathfind 연동)

### AC-4: 반응형 캔버스
- [ ] ResizeObserver로 컨테이너 크기 추적
- [ ] 카메라 viewW/viewH 동적 조정
- [ ] 최소 320x240 ~ 최대 960x576
- [ ] 가로/세로 모드 대응

### AC-5: PixelOffice.tsx 입력 리팩터
- [ ] 기존 onKeyDown 핸들러를 InputManager로 교체
- [ ] E키/Enter 상호작용을 InputManager.interact로 통합
- [ ] 더블클릭 로그 패널 → 메뉴 버튼으로 변경 (터치 호환)

## E2E 시나리오

1. 모바일 브라우저에서 /office 진입 → D-pad 자동 표시
2. D-pad 방향 탭 → CEO 오리 이동
3. NPC 옆에서 A 버튼 탭 → 대화 시작
4. NPC 직접 탭 → 대화 시작 (인접 시)
5. 데스크톱에서 키보드 입력 시 D-pad 자동 숨김
6. 화면 회전/리사이즈 → 캔버스 + D-pad 자동 조정

## 비스코프

- 핀치 줌 — 후속
- 제스처 스와이프 이동 — 후속 (D-pad가 우선)
- 자동 경로 이동 (탭한 곳으로 pathfind) — Phase E 이후
