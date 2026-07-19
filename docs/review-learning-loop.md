# Review-Learning Loop — LDD 적응판 (2단계 도입)

원리: 탐지 -> 기록 -> 재검증 -> 치유 -> 예방의 닫힌 고리.
같은 패턴이 재발하면 심각도를 자동 상향하고, 90일 이상 재발 없으면 stale 처리한다.

## LDD 적응 변경점 (원안 대비)

1. DETECT 실행기 통합: gstack /review (SEC-) + /ponytail-review (REF- 과잉구현)
   + 중복/인벤토리 위반 점검 (REF-). gstack /retro의 교훈도 lessons-learned로 합류 (저장소 이원화 금지).
2. 인벤토리 소스: packages/core, api, ui, mascot, ai. 위반 = apps에서 packages 기능 재구현.
3. 도입 단계:
   - 1단계 (현재): 저장 구조 + /review 커맨드만. 트리거는 Phase 완료 시 수동 1회.
   - 2단계 (Phase 4~5 승격): 로컬 스케줄러(Windows Task Scheduler)가 headless
     Claude Code(claude -p "/review --all")를 일일 실행. [가정] 동작은 승격 시점 실측.
   - GitHub Actions 배치는 채택하지 않는다: 유료 API 키 필요 - 무료 원칙 위반 (SKIP).

## 심각도 점수화

점수 = 중복 라인 수 x 발견 위치 수 x 난이도 가중치
가중치: x3.0 인벤토리 위반 / x2.0 공통 모듈 신설 명백 / x1.0 신설 가능 / x0.5 앱 특화
등급: SEC-CRITICAL/HIGH/MEDIUM/LOW, REF-CRITICAL(81+)/HIGH(31-80)/MEDIUM(11-30)/LOW(3-10)
배포 판정은 SEC-만. 재발 시 심각도 +1 등급, 재발 플래그.

## 경계 규칙

- lessons-learned: 실제 버그 + REF-HIGH 이상만. 수명 메타데이터 필수.
- docs/reviews/: immutable 스냅샷. 보안/운영 발견과 MEDIUM 이하는 여기까지만.
- anti-patterns: 상세 예제 전담, lessons-learned와 상호 링크.
- resolved는 사용자 승인으로만 전이, 다음 사이클에 archived-lessons.md 이관.
