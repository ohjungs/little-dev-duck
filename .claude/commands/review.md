# /review — 리뷰 하네스 (DETECT 단계 실행기)

전제: ponytail, gstack 플러그인 설치됨. 전체 원리는 docs/review-learning-loop.md.

절차:
1. DELTA: docs/reviews/ 최신 스냅샷의 SEC-CRITICAL/HIGH 해결 여부 확인.
   docs/anti-patterns/의 grep 패턴 실행, 재발 시 lessons-learned 재발 횟수 +1, 심각도 +1.
2. DETECT: 관점별 리뷰 실행.
   - 보안/운영 (SEC-): gstack /review 기준 - 시크릿 노출, RLS 누락, 입력 검증, 롤백 가능성
   - 과잉구현 (REF-): /ponytail-review - 삭제 목록 산출
   - 중복/인벤토리 (REF-): packages 기능의 apps 재구현 탐지 (가중치 x3.0)
   - DX/성능: 계층 위반, any, 빈 catch, 하드코딩, 죽은 코드
3. RECORD: docs/reviews/YYYY-MM-DD.md 스냅샷 저장 (immutable).
   REF-HIGH 이상은 lessons-learned 추가를 제안하고 사용자 승인 후 기록.
4. 판정: SEC- 등급만으로 배포 차단 여부 보고. 모든 권고에 MUST/SHOULD/DEFER/SKIP 태그.
