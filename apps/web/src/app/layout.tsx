import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    card: "summary",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <OfflineIndicator />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
