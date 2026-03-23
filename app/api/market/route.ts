// app/api/market/route.ts
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

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
    // 30일 전 날짜를 문자열로 안전하게 변환
    const period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const historical = await yahooFinance.historical(ticker, {
      period1: period1,
      interval: '1d',
    }) as any[];

    if (!historical || historical.length === 0) throw new Error("데이터 없음");

    const closePrices = historical.map((data: any) => data.close);
    const score = calculateRSI(closePrices);

    return NextResponse.json({ ticker, score });

  } catch (error: any) {
    console.error(`[${ticker}] API 에러:`, error.message);
    // 에러 발생 시 무한 로딩을 막기 위해 기본값(50) 반환
    return NextResponse.json({ ticker, score: 50 });
  }
}