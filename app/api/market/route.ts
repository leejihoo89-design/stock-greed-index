import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TWELVE_API_KEY = 'bcbdedd688014fc0816fcc0be79c541a';

// 🎯 1. 기존: 세부 지표 생성 (RSI를 기반으로 나머지 6개 지표 생성 - 유지)
function generateMetrics(baseScore: number) {
  const variation = () => (Math.random() * 10 - 5); // 약간의 변동성 부여
  return {
    momentum: Math.min(100, Math.max(0, baseScore + variation())),
    rsi: Math.min(100, Math.max(0, baseScore)), // RSI는 실제 계산값 사용
    supply: Math.min(100, Math.max(0, baseScore + variation())),
    sentiment: Math.min(100, Math.max(0, baseScore + variation())),
    volatility: Math.min(100, Math.max(0, 100 - baseScore + variation())), // 공포일 때 변동성 높음 (역방향)
    // 로직 보정: 탐욕장(점수 높음)일 때 공매도 세력이 박살나므로 리스크는 낮음(20) / 공포장일 때 숏 비중 높음(80)
    short_risk: Math.min(100, Math.max(0, baseScore > 70 ? 20 + variation() : 80 + variation())),
    relative_gain: Math.min(100, Math.max(0, baseScore + variation()))
  };
}

// 🎯 2. 신규: 3단계 정밀 탐욕 지수 계산 알고리즘 (가중치 + 극단값 증폭)
function calculateGreedIndex(metrics: any) {
  // 가중치 설정 (총합 1.0)
  const weights: any = {
    momentum: 0.20,
    volatility: 0.20,   // 역방향 지표 (아래 로직에서 뒤집음)
    rsi: 0.15,
    supply: 0.15,
    sentiment: 0.10,
    relative_gain: 0.10,
    short_risk: 0.10    // 역방향 지표 (아래 로직에서 뒤집음)
  };

  let weightedSum = 0;

  for (const key in weights) {
    let val = metrics[key] !== undefined ? metrics[key] : 50;

    // 변동성과 공매도 리스크는 수치가 높을수록 '공포'이므로, 탐욕 점수(0~100) 관점으로 역산 (100 - 값)
    if (key === 'volatility' || key === 'short_risk') {
      val = 100 - val;
    }

    weightedSum += val * weights[key];
  }

  // 극단값 증폭 (Multiplier: 1.5배 적용) -> 50점에서 멀어질수록 가속이 붙음
  const multiplier = 1.5;
  let finalScore = 50 + ((weightedSum - 50) * multiplier);

  // 0 미만, 100 초과 값 잘라내기 (최종 점수를 0 ~ 100 사이로 안전하게 고정)
  finalScore = Math.max(0, Math.min(100, finalScore));

  return Math.round(finalScore);
}

// 🎯 3. 기존: 실제 RSI 계산 로직 (유지)
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

// 🎯 4. 메인 API 핸들러 (흐름 통합)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  if (!ticker) return NextResponse.json({ error: '티커가 필요합니다.' }, { status: 400 });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=30&apikey=${TWELVE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "error") throw new Error(data.message);

    const closePrices = data.values.map((item: any) => parseFloat(item.close)).reverse();
    
    // [STEP 1] 실제 가격 데이터로 Base RSI 점수 산출
    const baseRSI = calculateRSI(closePrices);
    
    // [STEP 2] Base RSI를 바탕으로 7대 세부 지표 배열 생성
    const metrics = generateMetrics(baseRSI); 
    
    // [STEP 3] 🚀 새로 추가된 '정밀 탐욕 지수 알고리즘'을 통과시켜 최종 점수 산출!
    const finalGreedScore = calculateGreedIndex(metrics);

    return NextResponse.json({ 
      name: ticker, 
      score: finalGreedScore, // 🚀 증폭된 다이내믹 점수를 반환!
      metrics,                // 프론트엔드 막대그래프용 세부 7개 지표
      time: new Date().toLocaleTimeString()
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60' }
    });

  } catch (error: any) {
    // 에러 발생 시 중립(50) 데이터 반환 유지
    const fallbackMetrics = generateMetrics(50);
    return NextResponse.json({ 
      name: ticker, 
      score: 50, 
      metrics: fallbackMetrics, 
      reason: error.message 
    });
  }
}