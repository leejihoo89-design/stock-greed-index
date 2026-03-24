import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 💡 60초 캐싱 (트웰브 데이터 무료 한도 초과 방지용)

// 🔑 트웰브 데이터 API 키
const API_KEY = 'bcbdedd688014fc0816fcc0be79c541a';

// 🎯 1. 기존 RSI 계산 함수 (유지)
function calculateRSI(prices: number[]) {
  if (prices.length < 2) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.round(100 - (100 / (1 + rs)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  if (!ticker) return NextResponse.json({ error: '티커가 필요합니다.' }, { status: 400 });

  try {
    // 🚀 트웰브 데이터 정식 API 호출 (최근 30일 일봉 데이터 요청)
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=30&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // 트웰브 데이터 자체 에러 처리 (예: 잘못된 티커 등)
    if (data.status === "error") {
      throw new Error(data.message);
    }

    if (!data.values || data.values.length === 0) {
      throw new Error("데이터를 불러올 수 없습니다.");
    }

    // 💡 중요: 트웰브 데이터는 최신 날짜가 먼저 오므로(내림차순), 
    // RSI 계산을 위해 과거부터 오도록 배열을 뒤집어줍니다(.reverse())
    const closePrices = data.values.map((item: any) => parseFloat(item.close)).reverse();
    const score = calculateRSI(closePrices);

    return NextResponse.json({ ticker, score }, {
      headers: {
        // Vercel 서버에 60초 동안 점수 기억 (트웰브 데이터 호출 최소화)
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });

  } catch (error: any) {
    console.error(`[${ticker}] 트웰브 API 에러:`, error.message);
    return NextResponse.json({ ticker, score: 50 }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  }
}