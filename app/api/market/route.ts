import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

// RSI(탐욕 지수) 계산 함수
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
    const period1 = new Date();
    period1.setDate(period1.getDate() - 20);
    
    // 💡 해결 포인트: as any[] 를 추가하여 TypeScript 빌드 에러를 완벽히 차단합니다.
    const historical = await yahooFinance.historical(ticker, {
      period1: period1,
      interval: '1d',
    }) as any[];

    if (!historical || historical.length === 0) throw new Error("데이터 없음");

    // 💡 해결 포인트: data: any 로 타입을 명시하여 안전하게 종가를 뽑아옵니다.
    const closePrices = historical.map((data: any) => data.close);
    const score = calculateRSI(closePrices);

    return NextResponse.json({ ticker, score });

  } catch (error: any) {
    console.error(`[${ticker}] API 에러:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}