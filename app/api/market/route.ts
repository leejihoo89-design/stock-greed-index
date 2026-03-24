import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// 💡 1. 캐싱 설정: 60초(1분) 동안 Vercel 서버가 계산 결과를 기억함 (과부하 완벽 방어)
export const dynamic = 'force-dynamic';
export const revalidate = 60; 

// 🎯 2. 기존의 정확한 RSI 계산 함수 (유지)
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
    // 🎯 3. 기존의 30일치 데이터 조회 로직 (유지)
    const period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const historical = await yahooFinance.historical(ticker, {
      period1: period1,
      interval: '1d',
    }) as any[];

    if (!historical || historical.length === 0) throw new Error("데이터 없음");

    const closePrices = historical.map((data: any) => data.close).filter(Boolean);
    const score = calculateRSI(closePrices);

    // 💡 4. 성공 시: 진짜 RSI 점수를 반환하면서 캐싱 헤더 달아주기
    return NextResponse.json({ ticker, score }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });

  } catch (error: any) {
    console.error(`[${ticker}] API 에러:`, error.message);
    
    // 💡 5. 에러 시: 무한 로딩 방지용 50 반환 (이것도 60초 캐싱해서 야후 서버 찌르기 방지)
    return NextResponse.json({ ticker, score: 50 }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  }
}