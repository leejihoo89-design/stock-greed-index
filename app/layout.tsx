// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLOBAL GREED INDEX - 실시간 시장 탐욕 지수",
  description: "전 세계 주식 시장의 공포와 탐욕을 실시간 AI로 분석하여 데이터 기반의 투자 인사이트를 제공합니다.",
  openGraph: {
    title: "GLOBAL GREED INDEX",
    description: "지금 내가 관심 있는 종목의 시장 온도는? 실시간 랭킹 확인!",
    url: "https://stock-greed-index.vercel.app", // 실제 본인의 Vercel 주소로 바꿔주세요
    siteName: "Global Greed Index",
    images: [
      {
        url: "https://stock-greed-index.vercel.app/og-image.png", // 미리보기 이미지 주소
        width: 1200,
        height: 630,
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GLOBAL GREED INDEX",
    description: "실시간 주식 시장 공포/탐욕 지수 분석기",
    images: ["https://stock-greed-index.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}