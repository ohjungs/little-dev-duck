import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { resolveSiteUrl } from "@ldd/core";
import { Analytics } from "@vercel/analytics/next";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // og:image·canonical을 절대 URL로 만드는 기준점. 미설정 시 Next가 빌드 시점 localhost를
  // 정적 페이지에 박아버려 공유 카드 이미지가 깨진다(/welcome에서 실측).
  metadataBase: new URL(
    resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      VERCEL_PROJECT_PRODUCTION_URL:
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    }),
  ),
  title: {
    default: "Little Dev Duck",
    template: "%s — Little Dev Duck",
  },
  description: "3D 아기오리 AI 비서가 상주하는 개인 워크스페이스",
  keywords: ["productivity", "workspace", "AI", "duck", "notion alternative"],
  authors: [{ name: "Little Dev Duck" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Little Dev Duck",
  },
  icons: {
    apple: "/duck-logo.png",
  },
  openGraph: {
    title: "Little Dev Duck",
    description: "3D 아기오리 AI 비서가 상주하는 개인 워크스페이스",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    // 루트 opengraph-image(1200x630)가 있으므로 큰 카드로 노출한다.
    card: "summary_large_image",
    title: "Little Dev Duck",
    description: "3D 아기오리 AI 비서가 상주하는 개인 워크스페이스",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2026-07-30 : 이 값은 Next 스캐폴드 기본값 `en`이 그대로 남아 있었다. UI·description·
    // openGraph locale이 전부 한국어인데 문서 언어만 영어라, 스크린리더가 한국어를 영어
    // 발음 규칙으로 읽었다(WCAG 3.1.1, Level A). htmlLang.test.ts가 openGraph locale과의
    // 일치까지 잠근다.
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <OfflineIndicator />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
