import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🔑 결제 완료된 트웰브 데이터 API 키 (이제 제한 없이 쌩쌩 돌아갑니다!)
const TWELVE_API_KEY = 'bcbdedd688014fc0816fcc0be79c541a';

// 🎯 정확한 30일 RSI 계산 함수
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
    // 🚀 유료 플랜으로 업그레이드된 트웰브 데이터 정식 호출
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=30&apikey=${TWELVE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // 혹시라도 티커를 잘못 입력했을 때의 에러 처리
    if (data.status === "error") {
      console.error(`[${ticker}] Twelve Data 에러:`, data.message);
      return NextResponse.json({ ticker, score: 50, reason: data.message });
    }

    if (!data.values || data.values.length === 0) {
      return NextResponse.json({ ticker, score: 50, reason: "데이터 없음" });
    }

    // 트웰브 데이터는 최신 날짜가 먼저 오므로, 과거순으로 맞추기 위해 배열을 뒤집습니다(.reverse)
    const closePrices = data.values.map((item: any) => parseFloat(item.close)).reverse();
    const score = calculateRSI(closePrices);

    // ✅ 유료 플랜이라 한도는 넉넉하지만, 사이트 응답 속도를 0.1초로 만들기 위해 60초 캐싱 유지!
    return NextResponse.json({ ticker, score }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' }
    });

  } catch (error: any) {
    console.error(`[${ticker}] 시스템 에러:`, error.message);
    return NextResponse.json({ ticker, score: 50, reason: error.message });
  }
}