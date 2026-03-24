import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🔑 발급받으신 핀허브 API 키 적용 완료!
const FINNHUB_API_KEY = 'd7113c1r01ql6rg0v7l0d7113c1r01ql6rg0v7lg';

// 🎯 기존 RSI 계산 함수 (정확도 유지)
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
    // 핀허브는 날짜를 '유닉스 타임스탬프(초)' 단위로 받습니다.
    const to = Math.floor(Date.now() / 1000); 
    // 영업일 30일을 확보하기 위해 여유있게 과거 45일치 데이터를 요청합니다.
    const from = to - (45 * 24 * 60 * 60); 

    // 🚀 핀허브 정식 API 호출
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // 🚨 핀허브 데이터가 없거나 잘못된 티커일 때의 방어막
    if (data.s !== "ok" || !data.c || data.c.length === 0) {
      console.warn(`[${ticker}] Finnhub 데이터 없음:`, data);
      return NextResponse.json({ ticker, score: 50, reason: "데이터 없음" });
    }

    // 핀허브는 옛날부터 최신순으로 배열을 줍니다 (정방향)
    const closePrices = data.c;
    const score = calculateRSI(closePrices);

    // ✅ 성공 시 120초(2분) 동안 캐싱! (1분에 60번 한도이므로 이정도면 무적입니다)
    return NextResponse.json({ ticker, score }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error(`[${ticker}] 핀허브 API 에러:`, error.message);
    return NextResponse.json({ ticker, score: 50, reason: error.message });
  }
}