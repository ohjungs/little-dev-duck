# 2026-07-30 — 문서 언어(lang=ko) + GitHub 잔디 대체 텍스트

Task: 감사 발견 2건을 코드로 재검증 후 수정.
① `<html lang="en">` → `"ko"` (WCAG 3.1.1 Level A 위반: 앱 전체가 한국어인데 문서 언어만 영어라
스크린리더가 한국어를 영어 발음 규칙으로 읽었다. Next 스캐폴드 기본값이 한 번도 안 고쳐진 것).
② GitHub 잔디 격자에 `role="img"` + 요약 대체 텍스트(core `contributionGridLabel`).

## 스크린샷

- `welcome__default__desktop.png` / `welcome__default__mobile.png` — 공개 랜딩.
  **이 빌드에는 직전 사이클의 `--muted-foreground` 대비 수정도 포함돼 있다**(그 폴더의
  스크린샷은 재빌드 누락으로 구 색을 담고 있어 정정 표기함).

## 실측 확인 (브라우저 `getComputedStyle`, 새로 빌드한 서버)

| 항목 | 실측값 | 판정 |
|---|---|---|
| `document.documentElement.lang` | `ko` | 통과 (데스크톱·모바일 동일) |
| 보조 텍스트 대비 (`#6c6452` on `#fbfaf7`) | **5.62:1** | 통과 (AA 통상 텍스트 4.5:1) |

## 커버 못 한 것 (defer)

- **GitHub 잔디 위젯 화면**: 대시보드(로그인 필요)에 있고 e2e 인증 세션이 만료돼
  실제 렌더를 못 찍었다([manual-verification 109번](../../manual-verification.md)).
  대체 텍스트 문구 자체는 core 유닛 테스트 6건으로 잠갔고(경계값: 기여 0건·빈 배열·동일
  최대치 포함), `role="img"`는 리뷰로만 확인했다. 세션 재생성 후 스크린리더 실기 확인 필요.

## 이번 사이클에 발견한 절차 결함 (기록)

- 포트 5100에 **이전 실행이 남긴 낡은 서버**(PID 31608)가 계속 떠 있어 새 `next start`가
  `EADDRINUSE`로 죽고, 낡은 빌드가 응답했다 — 이것이 위 "구 색 스크린샷"의 직접 원인이다.
  앞으로 직접 서버를 띄워 검증할 때는 **응답이 비정상적으로 빠르면 낡은 서버를 의심**하고
  포트 점유를 먼저 확인한다(`netstat -ano | grep :5100`).
