# Spec: Phase A — 타일맵 기반 + 카메라 + 고퀄 오리 (2026-07-24)

> Status: DRAFT — `/spec-loop` 승인 대기

## 동기

현재 15x9 단일 방에서 80x60 멀티룸 오피스로 확장하려면 타일맵 + 카메라가 필수 선행.
동시에 오리 픽셀 품질을 3px 단위 → 8px 단위로 올려 스타듀밸리급 디테일을 확보.

## 수용 기준 (AC)

### AC-1: 타일맵 데이터 구조
- [ ] `packages/core/src/domain/office-tilemap.ts` 생성
- [ ] TileType enum (Floor, Wall, Desk, Chair, Door, Corridor, Carpet, Table, Plant, Bookshelf, CoffeeMachine, Whiteboard, Server, Reception)
- [ ] TileMap 타입: { cols, rows, tiles: Uint8Array, zones: Zone[] }
- [ ] 순수함수: getTile, setTile, isSolid, isBlocked, getZoneAt
- [ ] 테스트 5건 이상

### AC-2: 카메라 뷰포트 시스템
- [ ] `packages/core/src/domain/office-camera.ts` 생성
- [ ] Camera 타입, followTarget(lerp), worldToScreen, screenToWorld, visibleTileRange
- [ ] 맵 경계 클램프, 부드러운 lerp 추적
- [ ] 테스트 5건 이상

### AC-3: 맵 빌더 + 80x60 오피스 맵
- [ ] `packages/core/src/domain/office-map-builder.ts` 생성
- [ ] stampRoom, connectRooms, buildOfficeMap 함수
- [ ] 9개 부서 + 사장실 + 로비 + 식당 + 회의실 + 서버실 + 복도
- [ ] 각 방에 문(Door) 타일로 복도 연결
- [ ] 테스트: buildOfficeMap이 유효한 맵 반환, zone 개수 검증

### AC-4: 고퀄 오리 드로잉 (16x16px 캐릭터, 32x32 대형 오브젝트)
- [ ] 타일 사이즈 16px 기준. 오리 캐릭터 = 16x16px. 책상/서버랙 등 대형 = 32x32px (2x2 타일)
- [ ] drawDuck을 16x16 캔버스 내에서 픽셀 단위로 정밀 묘사:
  - 머리(5x5px), 몸통(6x8px), 부리(3x2px), 눈(1x1 or 2x1), 날개(2x4px), 발(3x2px)
  - 앉기/서기 자세 구분, 타이핑 시 팔(날개) 앞으로
- [ ] 4방향 facing (이동 방향에 따라 좌/우/위/아래)
- [ ] 상태별 포즈: idle(서있기), typing(앉아서 타이핑), walking(걷기 4프레임)
- [ ] 부서별 개성:
  - Engineering: 안경 + 후드 (색: 파랑)
  - Marketing: 넥타이 (색: 빨강)
  - Design: 베레모 (색: 보라)
  - HR: 뱃지 (색: 초록)
  - Finance: 안경 + 넥타이 (색: 남색)
  - Sales: 헤드셋 (색: 주황)
  - Support: 헤드셋 + 뱃지 (색: 청록)
  - QA: 돋보기 악세사리 (색: 노랑)
  - Operations: 클립보드 (색: 회색)
- [ ] CEO 오리: 왕관(👑) + 금색 넥타이, 18x18px (약간 더 큼)
- [ ] 오리별 이름표 (아래 작은 텍스트)
- [ ] `imageRendering: pixelated` 유지

### AC-4b: 디테일 가구/오브젝트 드로잉 (16x16 + 32x32)
- [ ] 16x16 소형: 의자, 화분, 화분(대), 커피머신, 쓰레기통, 시계(벽), 소화기, 우산꽂이, 물병
- [ ] 32x32 대형: 책상+모니터+키보드+마우스, 서버랙, 화이트보드, 회의테이블, 소파, 프린터, 복사기, 냉장고
- [ ] 부서 특화 가구:
  - Engineering: 듀얼 모니터, 기계식 키보드, 피규어
  - Design: 드로잉 태블릿, 컬러 팔레트, 큰 모니터
  - Marketing: 프레젠테이션 스크린, 브로셔 스탠드
  - Finance: 서류 캐비닛, 계산기, 금고
  - HR: 면접 소파, 이력서 파일함
  - Sales: 전화기, 실적 차트보드
  - Support: 다중 모니터, 티켓 보드
  - QA: 테스트 기기 선반, 버그 보드
  - Operations: 대시보드 스크린, 서류 트레이
- [ ] 공용: 정수기, 자판기, 화장실 표시, 비상구, 엘리베이터(장식), 시계, 캘린더

### AC-5: PixelOffice.tsx 카메라 통합
- [ ] 기존 15x9 직접 그리기 → 카메라 기반 렌더로 교체
- [ ] visibleTileRange로 보이는 타일만 순회
- [ ] worldToScreen으로 좌표 변환
- [ ] 타일 타입별 색상/패턴 렌더링 (Wall=갈색, Desk=나무색, Carpet=부서색 등)
- [ ] 반응형 캔버스: ResizeObserver로 컨테이너 크기 추적

### AC-6: movePlayer 타일맵 연동
- [ ] office-play.ts의 isBlocked 콜백을 office-tilemap.isBlocked로 연결
- [ ] 기존 테스트 통과 유지

## E2E 시나리오

1. 오피스 진입 시 80x60 맵 렌더링, CEO 오리가 사장실에서 시작
2. 방향키로 이동 → 카메라가 부드럽게 따라감
3. 벽/책상에 부딪히면 이동 불가 (타일맵 충돌)
4. 문을 통과하면 다른 방으로 이동, 현재 구역 이름 표시
5. 오리가 4방향으로 향하며, 각 부서 직원은 고유 색상
6. 전 패키지 tsc + eslint + 테스트 GREEN

## 비스코프

- 스프라이트 시트 (PNG 에셋) — 절차적 폴백으로 충분
- NPC 이동/스케줄 — Phase E
- 모바일 터치 — Phase C (별도 스펙)
- 사운드 — Phase H
