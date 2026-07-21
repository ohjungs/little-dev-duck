import { WalkerScene } from "@/components/WalkerScene";

// 데스크톱 활보 모드(Phase 6 T3) 전용 라우트. Tauri walker 창이 투명·클릭통과로 이 페이지를
// 바탕화면 오버레이로 띄운다. 사용자 데이터를 노출하지 않는 순수 표시용이라 무인증 공개
// 경로다(proxy.ts PUBLIC_PATHS). nonce CSP 정합을 위해 정적 프리렌더 대신 동적 렌더.
export const dynamic = "force-dynamic";

export default function WalkerPage() {
  return <WalkerScene />;
}
