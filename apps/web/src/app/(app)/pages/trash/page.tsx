import { TrashView } from "@/components/TrashView";

// /pages/trash — 휴지통. 정적 세그먼트라 /pages/[id]보다 우선 매칭된다.
export default function TrashRoute() {
  return <TrashView />;
}
