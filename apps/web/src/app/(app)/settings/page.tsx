import Image from "next/image";
import {
  Activity,
  Bell,
  Database,
  CalendarClock,
  Download,
  Info,
  Keyboard,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Moon,
  Palette,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import { getGithubTokens, getGmailTokens, getGoogleTokens } from "@ldd/api";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppearanceSetting } from "@/components/AppearanceSetting";
import { QuietHoursSetting } from "@/components/QuietHoursSetting";
import { NotifySetting } from "@/components/NotifySetting";
import { SendKeySetting } from "@/components/SendKeySetting";
import { MessageStorageCard } from "@/components/MessageStorageCard";
import { MessageNotifySetting } from "@/components/MessageNotifySetting";
import { DataSaverSetting } from "@/components/DataSaverSetting";
import { buildLabel } from "@/lib/buildInfo";
import { SettingsResetCard } from "@/components/SettingsResetCard";
import { HealthStatus } from "@/components/HealthStatus";
import { GoogleCalendarLink } from "@/components/GoogleCalendarLink";
import { GitHubIssuesLink } from "@/components/GitHubIssuesLink";
import { GitHubMark } from "@/components/ui/github-mark";
import { GmailLink } from "@/components/GmailLink";
import { GithubContributionWidget } from "@/components/GithubContributionWidget";
import { accountDeletionEnabled } from "@ldd/core";
import { DangerZone } from "@/components/DangerZone";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { DashboardLayoutPanel } from "@/components/DashboardLayoutPanel";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ExportDataButton } from "@/components/ExportDataButton";
import { ImportDataButton } from "@/components/ImportDataButton";
import { LocalResetButton } from "@/components/LocalResetButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const googleLinked = user ? !!(await getGoogleTokens(supabase, user.id)) : false;
  const githubLinked = user ? !!(await getGithubTokens(supabase, user.id)) : false;
  const gmailLinked = user ? !!(await getGmailTokens(supabase, user.id)) : false;

  // 이름·이메일은 더 이상 서버에서 내려주지 않는다 — 프로필 카드가 편집 가능해지면서
  // ProfileSettings가 직접 읽는다(같은 값을 두 곳에서 가져오면 저장 후 한쪽만 낡는다).
  const provider = user?.app_metadata.provider ?? "이메일";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground">
          외관과 계정을 개인화하세요.
        </p>
      </div>

      {/* 이름 없는 section은 스크린리더에 landmark로 노출되지 않는다 — 제목과 묶어 건너뛸 수 있게 한다. */}
      <section className="mb-2" aria-labelledby="settings-personal">
        <h2 id="settings-personal" className="mb-3 mt-2 text-sm font-semibold tracking-tight text-muted-foreground">개인화</h2>
        {/* 다단(masonry)은 묶음마다 따로 잡는다 — 하나로 묶으면 제목이 열 사이를 가로지른다. */}
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Palette className="size-4 text-primary-accent" />
              외관
            </CardTitle>
            <CardDescription>테마를 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSetting />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Moon className="size-4 text-primary-accent" />
              방해금지 시간대
            </CardTitle>
            <CardDescription>
              지정한 시간대엔 오리가 혼잣말을 하지 않고 조용히 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuietHoursSetting />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Bell className="size-4 text-primary-accent" />
              브라우저 알림
            </CardTitle>
            <CardDescription>
              레벨 업 같은 순간을 브라우저 알림으로 받습니다(방해금지 시간대엔 조용, 하루 상한 있음).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotifySetting />
          </CardContent>
        </Card>
        {/* 2026-07-29 (F-003): 전송 키. IME 문제를 겪은 한국어 사용자는 Ctrl+Enter를 원한다. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Keyboard className="size-4 text-primary-accent" />
              메시지 전송 키
            </CardTitle>
            <CardDescription>
              메신저 입력창에서 Enter를 전송으로 쓸지, 줄바꿈으로 쓸지 정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendKeySetting />
          </CardContent>
        </Card>
        {/* 2026-07-29 (Phase 56 M-007·M-008): 방이 늘면 전부 알림은 곧 전부 끔이 된다 — 키워드만 골라 받는 길. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Bell className="size-4 text-primary-accent" />
              메시지 알림 방식
            </CardTitle>
            <CardDescription>
              새 메시지 알림을 전부 받을지, 고른 키워드가 들었을 때만 받을지 정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessageNotifySetting />
          </CardContent>
        </Card>
        {/* 2026-07-29 (Phase 56 T2 T-009): 대역폭 5GB/월 대책 — 사진을 누를 때만 받는다. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Download className="size-4 text-primary-accent" />
              데이터 절약 모드
            </CardTitle>
            <CardDescription>
              무료 한도(대역폭 월 5GB)를 아낍니다. 켜면 대화 속 사진을 자동으로 받지 않아요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataSaverSetting />
          </CardContent>
        </Card>
        {/* 2026-07-29 (Q-022): 무료 티어 1GB의 계기판. 50% 초과가 정리(Phase 55 T3) 착수 기준이다. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Database className="size-4 text-primary-accent" />
              메신저 저장 공간
            </CardTitle>
            <CardDescription>
              대화에 올린 사진이 쓰는 저장 공간을 무료 한도(1GB) 대비로 보여줍니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessageStorageCard />
          </CardContent>
        </Card>
        {/* 2026-07-26 (피드백 6-1·1-2·1-5): 대시보드 구성도 "내 것"이라 설정에 둔다.
            관리자 화면에 있었는데, 경계 규칙은 **설정 = 내 것(개인화) · 관리자 = 남의 것(권한 부여)**이다. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <LayoutDashboard className="size-4 text-primary-accent" />
              대시보드 구성
            </CardTitle>
            <CardDescription>
              대시보드 카드의 순서를 바꾸고, 쓰지 않는 카드는 숨깁니다. 내 계정에만
              적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardLayoutPanel />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <User className="size-4 text-primary-accent" />
              프로필
            </CardTitle>
            <CardDescription>
              {provider} 계정으로 로그인됨. 이름을 바꾸면 사이드바와 오리 인사말에 함께
              반영됩니다.
            </CardDescription>
          </CardHeader>
          {/* 2026-07-26 (피드백 6-1): 여기는 읽기 전용 카드였고, 편집 기능은 관리자 화면에
              있었다. 사용자는 "왼쪽아래 계정정보"를 고치려고 **설정**을 연다 — 기능은 만들어
              두고 도달 경로가 어긋나 있었다. 새 카드를 만들지 않고 이 카드를 편집 가능하게 바꾼다
              (같은 것이 두 곳에 생기면 어느 쪽이 진짜인지 알 수 없다). */}
          <CardContent className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
              <Image
                src="/duck-logo.png"
                alt=""
                width={48}
                height={48}
                className="size-12 object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <ProfileSettings />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Keyboard className="size-4 text-primary-accent" />
              키보드 단축키
            </CardTitle>
            <CardDescription>자주 쓰는 단축키 목록입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {[
                { label: "명령 팔레트", key: "Ctrl+K" },
                { label: "할 일 추가", key: "Ctrl+Shift+T" },
                { label: "오피스 이동", key: "방향키 / WASD" },
                { label: "오피스 상호작용", key: "E" },
                { label: "오피스 경영 패널", key: "Tab" },
                { label: "오피스 미니맵", key: "M" },
                { label: "오피스 사운드", key: "N" },
                { label: "오피스 도움말", key: "?" },
              ].map(({ label, key }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground shadow-[0_1px_0_0] shadow-border">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </section>

      {/* 이름 없는 section은 스크린리더에 landmark로 노출되지 않는다 — 제목과 묶어 건너뛸 수 있게 한다. */}
      <section className="mb-2" aria-labelledby="settings-integrations">
        <h2 id="settings-integrations" className="mb-3 mt-2 text-sm font-semibold tracking-tight text-muted-foreground">연동</h2>
        {/* 다단(masonry)은 묶음마다 따로 잡는다 — 하나로 묶으면 제목이 열 사이를 가로지른다. */}
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {/* 외부 연동을 한 카드로 통합 — 서비스별로 흩어진 카드를 한곳에서 바로바로 연동. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Link2 className="size-4 text-primary-accent" />
              외부 연동
            </CardTitle>
            <CardDescription>
              오리가 여러분의 서비스에 실제 작업을 수행하도록 연동합니다. 로그인 방법과 무관합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary-accent" />
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">일정 조회·생성</p>
                </div>
              </div>
              <GoogleCalendarLink linked={googleLinked} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-start gap-3">
                <GitHubMark className="mt-0.5 size-5 shrink-0 text-primary-accent" />
                <div>
                  <p className="text-sm font-medium">GitHub 이슈</p>
                  <p className="text-xs text-muted-foreground">이슈 조회·생성</p>
                </div>
              </div>
              <GitHubIssuesLink linked={githubLinked} isPrimaryGithub={provider === "github"} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary-accent" />
                <div>
                  <p className="text-sm font-medium">Gmail</p>
                  <p className="text-xs text-muted-foreground">이메일 조회·휴지통 이동(영구삭제 없음)</p>
                </div>
              </div>
              <GmailLink linked={gmailLinked} />
            </div>
          </CardContent>
        </Card>
        {/* GitHub 잔디(기여 캘린더) — 대시보드에서 설정으로 이동. GitHub 로그인 시 표시. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <GitHubMark className="size-4 text-primary-accent" />
              GitHub 잔디
            </CardTitle>
            <CardDescription>
              GitHub 계정으로 로그인하면 최근 1년 기여 잔디를 볼 수 있어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GithubContributionWidget />
          </CardContent>
        </Card>
        </div>
      </section>

      {/* 이름 없는 section은 스크린리더에 landmark로 노출되지 않는다 — 제목과 묶어 건너뛸 수 있게 한다. */}
      <section className="mb-2" aria-labelledby="settings-data">
        <h2 id="settings-data" className="mb-3 mt-2 text-sm font-semibold tracking-tight text-muted-foreground">데이터</h2>
        {/* 다단(masonry)은 묶음마다 따로 잡는다 — 하나로 묶으면 제목이 열 사이를 가로지른다. */}
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Download className="size-4 text-primary-accent" />
              데이터 내보내기·가져오기
            </CardTitle>
            <CardDescription>
              할 일·메모·습관·습관 체크 기록·캘린더 일정·페이지(본문 포함)·뉴스 피드·오리
              상태·집중 기록·활동 기록을 JSON 파일로 내보냅니다. 이 브라우저에만 있던 설정
              (할 일 순서·즐겨찾기·북마크·방해금지)도 함께 담깁니다. 가져오기는 지금 데이터를
              지우거나 바꾸지 않고, 이미 있는 항목은 건너뜁니다. 연동 계정 토큰은 안전을 위해
              파일에 담지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ExportDataButton />
            <ImportDataButton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <RotateCcw className="size-4 text-primary-accent" />
              로컬 데이터 초기화
            </CardTitle>
            <CardDescription>
              브라우저에 저장된 테마·즐겨찾기·최근 페이지 등 로컬 설정을 초기화합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocalResetButton />
          </CardContent>
        </Card>
        </div>
      </section>

      {/* 이름 없는 section은 스크린리더에 landmark로 노출되지 않는다 — 제목과 묶어 건너뛸 수 있게 한다. */}
      <section className="mb-2" aria-labelledby="settings-account">
        <h2 id="settings-account" className="mb-3 mt-2 text-sm font-semibold tracking-tight text-muted-foreground">계정과 상태</h2>
        {/* 다단(masonry)은 묶음마다 따로 잡는다 — 하나로 묶으면 제목이 열 사이를 가로지른다. */}
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <LogOut className="size-4 text-primary-accent" />
              계정
            </CardTitle>
            <CardDescription>
              이 기기에서 로그아웃합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/auth/logout" method="post">
              <Button type="submit" variant="outline">
                <LogOut />
                로그아웃
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Activity className="size-4 text-primary-accent" />
              서비스 상태
            </CardTitle>
            <CardDescription>
              연결된 서비스가 정상인지 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HealthStatus />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Info className="size-4 text-primary-accent" />
              앱 정보
            </CardTitle>
            {/* T-023: 고정 버전 문자열은 어떤 배포와도 무관했다 — 실제 배포 커밋을 보여준다. */}
            <CardDescription>
              {`Little Dev Duck · ${buildLabel(process.env.VERCEL_GIT_COMMIT_SHA)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Next.js 16 + Supabase + Gemini AI
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>블록 에디터 (BlockNote)</li>
                <li>AI 오리 비서 (Gemini)</li>
                <li>픽셀 오피스</li>
                <li>뉴스 피드</li>
                <li>GitHub 기여 잔디</li>
                <li>뽀모도로 타이머</li>
                <li>습관 트래커</li>
                <li>캘린더 연동</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        </div>
      </section>

      {/* 이름 없는 section은 스크린리더에 landmark로 노출되지 않는다 — 제목과 묶어 건너뛸 수 있게 한다. */}
      <section className="mb-2" aria-labelledby="settings-danger">
        <h2 id="settings-danger" className="mb-3 mt-2 text-sm font-semibold tracking-tight text-muted-foreground">위험</h2>
        {/* 다단(masonry)은 묶음마다 따로 잡는다 — 하나로 묶으면 제목이 열 사이를 가로지른다. */}
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {/* 2026-07-29 (Phase 56 T2 T-031): 기기 설정 초기화 — DB는 안 건드린다(전체 삭제와 구분). */}
        <Card className="border-destructive/30">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <RotateCcw className="size-4 text-destructive" />
              이 기기 설정 초기화
            </CardTitle>
            <CardDescription>
              이 브라우저에 저장된 설정·기록을 지웁니다. 계정 데이터는 그대로예요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsResetCard />
          </CardContent>
        </Card>
        {user && (
          <Card className="border-destructive/30">
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>
                <Trash2 className="size-4 text-destructive" />
                위험 구역
              </CardTitle>
              <CardDescription>
                내 모든 콘텐츠를 영구 삭제합니다. 되돌릴 수 없어요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DangerZone userId={user.id} />
              {/* 2026-07-26 (Phase 35): 계정 삭제는 service_role 키가 있어야 동작한다.
                  **키가 없으면 버튼 자체를 렌더하지 않는다** — 없는 기능을 보여주면 눌러 보고
                  실패한다. 서버 컴포넌트라 이 판정이 클라이언트로 새지 않는다(키 값 자체는
                  넘기지 않고 "켜졌는가"만 본다). */}
              {accountDeletionEnabled(process.env.SUPABASE_SERVICE_ROLE_KEY) && (
                <DeleteAccountButton />
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </section>


      <p className="mt-8 text-xs text-muted-foreground">Little Dev Duck v1.0.0</p>
    </div>
  );
}
