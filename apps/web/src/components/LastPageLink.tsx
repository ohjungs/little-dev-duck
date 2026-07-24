"use client";

// 대시보드 퀵액션 행 아래에 마지막 편집 페이지 바로가기를 표시한다.
// localStorage는 클라이언트에서만 접근 가능하므로 'use client' 필수.
import Link from "next/link";
import { getRecentPages } from "@/lib/recentPages";

export function LastPageLink() {
  const lastPage = getRecentPages()[0];
  if (!lastPage) return null;

  return (
    <Link
      href={`/pages/${lastPage.id}`}
      className="text-sm text-primary-accent hover:underline"
    >
      마지막 편집: {lastPage.title}
    </Link>
  );
}
