export interface SpinnerProps {
  size?: number;
  label?: string;
}

// 원형 로딩 인디케이터. keyframes를 컴포넌트가 함께 렌더해 별도 전역 CSS 설정이 필요 없다
// (같은 이름의 중복 정의는 무해). role/aria-label로 스크린리더에 로딩 상태를 알린다.
export function Spinner({ size = 20, label = "불러오는 중" }: SpinnerProps) {
  return (
    <>
      <style>{"@keyframes ldd-spin{to{transform:rotate(360deg)}}"}</style>
      <span
        role="status"
        aria-label={label}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          border: "2px solid color-mix(in srgb, var(--ldd-color-accent) 30%, transparent)",
          borderTopColor: "var(--ldd-color-accent)",
          borderRadius: "50%",
          animation: "ldd-spin 0.7s linear infinite",
        }}
      />
    </>
  );
}
