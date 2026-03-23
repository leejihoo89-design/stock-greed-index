// app/api/market/route.ts
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic'; // 항상 실시간으로 작동하게 만듦

// 간단한 RSI(상대강도지수) 계산 공식 (탐욕 지수로 활용)
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
    // 1. 최근 14일치 데이터 가져오기
    const period1 = new Date();
    period1.setDate(period1.getDate() - 20); // 주말 고려해서 20일 전부터
    
    const historical = await yahooFinance.historical(ticker, {
      period1: period1,
      interval: '1d',
    });

    if (!historical || historical.length === 0) throw new Error("데이터 없음");

    // 2. 종가(Close)만 뽑아서 탐욕 지수(RSI) 계산
    const closePrices = historical.map(data => data.close);
    const score = calculateRSI(closePrices);

    return NextResponse.json({ ticker, score });

  } catch (error: any) {
    console.error(`[${ticker}] API 에러:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}