import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) return NextResponse.json({ ticker: null });

  // 💡 핵심 패치: 네이버/야후 서버가 봇으로 인식하지 못하게 일반 크롬 브라우저인 것처럼 위장합니다.
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };

  try {
    // 1단계: 네이버 금융 검색 (한국 주식)
    if (/[가-힣]/.test(q)) {
      const naverRes = await fetch(`https://ac.finance.naver.com/ac?q=${encodeURIComponent(q)}&q_enc=utf-8&st=111&r_format=json&r_enc=utf-8`, { headers });
      
      if (naverRes.ok) {
        const naverData = await naverRes.json();
        if (naverData.items && naverData.items[0] && naverData.items[0].length > 0) {
          const tickerCode = naverData.items[0][0][1]; // "259630"
          console.log(`[번역 성공] ${q} -> ${tickerCode} (네이버)`);
          return NextResponse.json({ ticker: tickerCode });
        }
      }
    }

    // 2단계: 야후 파이낸스 검색 (미국 주식 및 예비용)
    const yahooRes = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`, { headers });
    
    if (yahooRes.ok) {
      const yahooData = await yahooRes.json();
      if (yahooData.quotes && yahooData.quotes.length > 0) {
        const bestMatch = yahooData.quotes[0].symbol;
        let finalTicker = bestMatch;
        
        if (bestMatch.endsWith('.KS') || bestMatch.endsWith('.KQ')) {
          finalTicker = bestMatch.split('.')[0];
        }
        console.log(`[번역 성공] ${q} -> ${finalTicker} (야후)`);
        return NextResponse.json({ ticker: finalTicker });
      }
    }
    
    // 못 찾았을 경우
    console.log(`[번역 실패] ${q} (결과 없음)`);
    return NextResponse.json({ ticker: q });
    
  } catch (error) {
    console.error("검색 API 오류:", error);
    return NextResponse.json({ ticker: q });
  }
}