import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="text-8xl" role="img" aria-label="오리">
        🦆
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          이 페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-muted-foreground">
          주소가 잘못됐거나 페이지가 삭제됐을 수 있어요.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
