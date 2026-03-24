import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🔥 질문자님이 확인해주신 40자리 진짜 키 전체를 그대로 적용했습니다!
const FINNHUB_API_KEY = 'd7113c1r01ql6rg0v7l0d7113c1r01ql6rg0v7lg';

function calculateRSI(prices: number[]) {
  if (!prices || prices.length < 2) return 50;
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
    const to = Math.floor(Date.now() / 1000); 
    const from = to - (45 * 24 * 60 * 60); 

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // 💡 디버깅용: 핀허브에서 키 오류 등의 에러를 주면 이유를 뱉어냅니다.
    if (data.error) {
       return NextResponse.json({ ticker, score: 50, reason: `핀허브 거절: ${data.error}` });
    }

    if (data.s !== "ok" || !data.c || data.c.length === 0) {
      return NextResponse.json({ ticker, score: 50, reason: "데이터 없음 (휴장일 또는 잘못된 티커)" });
    }

    const closePrices = data.c;
    const score = calculateRSI(closePrices);

    return NextResponse.json({ ticker, score }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    return NextResponse.json({ ticker, score: 50, reason: error.message });
  }
}