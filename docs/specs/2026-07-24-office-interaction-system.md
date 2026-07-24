# Spec: Phase F — CEO 상호작용 시스템 + 사장실 대시보드 (2026-07-24)

> Status: DRAFT — `/spec-loop` 승인 대기

## 동기

사장(CEO)이 직원에게 말 걸면 현재 업무 상세 항목이 나와야 함.
사장실에서는 전사 활동 로그를 실시간으로 조회할 수 있어야 함.
단순 "뭐하고 있어요" 한 줄이 아니라, 구체적인 작업 목록/상태/진행률 표시.

## 수용 기준 (AC)

### AC-1: 직원 대화 — 상세 업무 패널
- [ ] NPC에게 말 걸면 대화 패널(React 오버레이)이 열림
- [ ] 패널 내용:
  - 직원 이름 + 부서 + 역할
  - 현재 상태 아이콘 + 라벨 (타이핑 중 / 리뷰 중 / 테스트 중 / 회의 중 / 점심 / 퇴근)
  - **현재 작업 항목 목록** (최대 5개):
    - 작업명 (예: "auth 리팩터링", "마케팅 보고서 작성")
    - 상태 (진행중 / 완료 / 대기)
    - 진행률 바 (0~100%)
  - 최근 완료 작업 (최대 3개, 시간 표시)
  - 기분/생산성 이모지 (후속)
- [ ] 패널 닫기: X 버튼 + ESC + 이동 시 자동 닫힘
- [ ] 모바일: 하단 시트(bottom sheet) 형태로 표시

### AC-2: core — NPC 작업 데이터 구조
- [ ] `packages/core/src/domain/office-npc.ts`에 추가:
```typescript
export type NpcTask = {
  id: string;
  title: string;
  status: "active" | "done" | "waiting";
  progress: number; // 0~100
  startedAt: number; // game time
};

export type NpcProfile = {
  id: string;
  name: string;
  department: DepartmentId;
  role: string; // "시니어 개발자", "마케팅 매니저"
  tasks: NpcTask[];
  recentDone: NpcTask[]; // 최근 완료 (max 3)
  mood: "happy" | "neutral" | "stressed" | "tired";
};
```
- [ ] 부서별 NPC 이름/역할 프리셋 (한국어)
- [ ] 시뮬레이터: 게임 시간에 따라 작업 진행률 증가, 완료, 새 작업 생성

### AC-3: 사장실 전체 로그 대시보드
- [ ] CEO가 사장실 책상 앞에 서면 자동으로 대시보드 UI 표시
- [ ] 대시보드 내용:
  - **전사 활동 피드** (시간순, 스크롤): "[시간] [부서] [이름] — [활동]"
  - **부서별 요약 카드** (9개 부서):
    - 부서명 + 인원수
    - 활성 작업 수 / 완료 작업 수
    - 전체 진행률 바
  - **오늘의 하이라이트**: 가장 생산적인 부서, 최다 완료 직원
- [ ] 대시보드 닫기: 책상에서 벗어나면 자동 닫힘
- [ ] React 오버레이(OfficeHUD.tsx 내부)로 렌더링

### AC-4: core — 전사 활동 로그 시스템
- [ ] `packages/core/src/domain/office-activity.ts` 생성
- [ ] ActivityEntry 타입: { timestamp, department, npcName, action, detail }
- [ ] 링 버퍼 (max 200 entries)
- [ ] 부서별 집계 함수: departmentSummary(entries, departments)
- [ ] 테스트 3건 이상

### AC-5: 대화 시 상호작용 선택지
- [ ] 대화 패널에 선택지 버튼:
  - "업무 현황 보기" → 작업 목록 상세 표시
  - "수고하고 있네" → 기분 +1 (사기 진작)
  - "이것 좀 해줘" → 작업 지시 (후속)
  - "돌아가기" → 패널 닫기
- [ ] 선택지는 키보드 1~4 또는 탭으로 선택

## E2E 시나리오

1. 개발팀 방에서 오리에게 다가가 E/탭 → 대화 패널 열림
2. "시니어 개발자 오리" — 현재 작업 3건 (auth 리팩터 70%, API 문서 30%, 코드리뷰 대기)
3. "업무 현황 보기" 선택 → 작업별 진행률 바 표시
4. "수고하고 있네" 선택 → 오리 기분 표정 변화
5. 사장실 책상 앞 → 전사 대시보드 자동 표시
6. 대시보드: 9개 부서 카드 + 활동 피드 스크롤
7. 사장실에서 벗어나면 대시보드 자동 닫힘

## 비스코프

- 작업 지시 시스템 (사장→직원 태스크 할당) — 후속
- 직원 고용/해고 — 후속
- 직원 성과 평가 — 후속
- 실제 Claude Code 이벤트 연동 — Phase I
