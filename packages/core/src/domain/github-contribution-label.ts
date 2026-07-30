import type { ContributionSummary } from "./github-contribution";

// 2026-07-30 : 접근성 - GitHub 잔디 - 대체 텍스트 (감사 발견)
//
// 잔디 격자는 순수 div 365개에 마우스용 `title`만 달려 있어 **스크린리더 사용자에게 아무것도
// 전달되지 않았다**(div의 title은 보조기술이 안정적으로 읽지 않고, 읽더라도 365개를 하나씩
// 듣는 건 도움이 아니라 방해다).
//
// 그래서 격자를 `role="img"` 하나로 묶고 이 문구를 대체 텍스트로 준다 — 데이터 시각화의 표준
// 기법이다(role="img"는 leaf라 내부 셀이 자동으로 보조기술에서 감춰지므로 셀마다 aria를
// 붙일 필요도 없다). 가짜 grid/row 역할을 씌우는 대안은 DOM이 열 우선(주 = 열)이라 행·열이
// 뒤바뀐 채 노출돼 오히려 틀린 정보를 준다.
//
// 문구 조립을 JSX 밖 순수함수로 두는 이유: 문자열을 컴포넌트 안에서 만들면 검사할 수 없다
// (이 저장소가 globals.css 색·safeHref에 쓴 것과 같은 판단).
export function contributionGridLabel(summary: ContributionSummary): string {
  const { totalCount, days } = summary;
  const active = days.filter((d) => d.count > 0);

  if (active.length === 0) {
    return "GitHub 기여 잔디: 기여가 아직 없어요.";
  }

  // 동일 최대치가 여럿이면 가장 이른 날. 임의로 흔들리면 같은 데이터에 다른 문구가 나온다.
  const busiest = active.reduce((best, d) => (d.count > best.count ? d : best));

  const period =
    days.length > 0 ? `${days[0].date}부터 ${days[days.length - 1].date}까지, ` : "";

  return (
    `GitHub 기여 잔디: ${period}총 ${totalCount}개. ` +
    `기여한 날은 ${active.length}일이고, 가장 많이 기여한 날은 ${busiest.date} ${busiest.count}개예요.`
  );
}
