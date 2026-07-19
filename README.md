# LDD — Little Dev Duck

안경 쓴 아기오리 AI 비서가 상주하는 개인 워크스페이스.

위젯 모드에서는 오리가 투두, 메모, 커밋 잔디(GitHub + Claude Code) 옆에서 뛰어다니고,
앱 모드에서는 블록 에디터 기반 워크스페이스로 확장된다. 오리는 RAG로 내 데이터를 알고 답하며,
Figma, Gamma, Google, GitHub, Notion, Gmail에 실제 작업을 수행하는 에이전트다.

- 스택: Next.js, Supabase, BlockNote, react-three-fiber, Tauri 2, Gemini, Vercel
- 원칙: 전 구간 무료 티어 운영 (도메인만 선택 유료)
- 개발: STDD + ponytail + gstack + Review-Learning Loop

## 문서 지도

| 문서 | 역할 |
|---|---|
| CLAUDE.md | 개발 규범 (모든 세션의 진입점) |
| docs/DECISIONS.md | 확정 의사결정 대장 |
| docs/ARCHITECTURE.md | 구조도 4종 + 스키마 골격 + 로드맵 |
| docs/plans/phase_01.md | 현재 Phase 계획 |
| docs/Status.md, docs/History.md | 진행 현황과 이력 |
| docs/review-learning-loop.md | 자가 학습 리뷰 루프 |

## 시작하기 (Phase 1 착수 시)

1. ponytail, gstack 플러그인 설치 (CLAUDE.md 7장)
2. 새 Claude Code 대화에서 /next-step
