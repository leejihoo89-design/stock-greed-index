import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

export const dynamic = 'force-dynamic';

interface Metrics {
  momentum: number;
  rsi: number;
  supply: number;
  sentiment: number;
  volatility: number;
  short_risk: number;
  relative_gain: number;
}

function calculateIndicators(data: any[]): { metrics: Metrics; score: number } | null {
  try {
    if (!data || data.length < 20) return null;

    const closes = data.map(d => parseFloat(d.close)).filter(c => !isNaN(c));
    const volumes = data.map(d => parseFloat(d.volume)).filter(v => !isNaN(v));

    if (closes.length < 20) return null;

    const close = closes[closes.length - 1];
    const volume = volumes[volumes.length - 1];

    // RSI
    const deltas = closes.slice(1).map((c, i) => c - closes[i]);
    const gains = deltas.map(d => d > 0 ? d : 0);
    const losses = deltas.map(d => d < 0 ? -d : 0);

    const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Momentum
    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
    const momentum = Math.min(Math.max(((close / ma50) - 0.8) * 250, 0), 100);

    // Short Risk
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const priceTrendScore = close < ma20 ? 40 : 15;

    const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const lastRet = (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2];
    const volPressureScore = lastRet <= 0 ? Math.min((volume / avgVol20) * 18.5, 40) : 10;

    const returns = deltas.map(d => d / closes.slice(1)[deltas.indexOf(d)]);
    const std20 = Math.sqrt(returns.slice(-20).reduce((sum, r) => sum + r * r, 0) / 20);
    const std5 = Math.sqrt(returns.slice(-5).reduce((sum, r) => sum + r * r, 0) / 5);
    const volAccelerationScore = std5 > std20 ? 20 : 8.5;

    const shortRisk = 2.3 + priceTrendScore + volPressureScore + volAccelerationScore;

    // Other metrics
    const vol5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const vol50 = volumes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, volumes.length);
    const supply = Math.min(Math.max((vol5 / vol50) * 52.3, 0), 100);

    const volatilityVal = std20 * Math.sqrt(252);
    const volatility = Math.max(100 - (volatilityVal * 105), 0);

    const relativeGain = Math.min(Math.max(50.5 + (returns.slice(-20).reduce((a, b) => a + b, 0) * 105), 0), 100);
    const sentiment = (rsi + momentum) / 2;

    const metrics: Metrics = {
      momentum: Math.round(momentum * 10) / 10,
      rsi: Math.round(rsi * 10) / 10,
      supply: Math.round(supply * 10) / 10,
      sentiment: Math.round(sentiment * 10) / 10,
      volatility: Math.round(volatility * 10) / 10,
      short_risk: Math.round(Math.min(Math.max(shortRisk, 10.5), 98.2) * 10) / 10,
      relative_gain: Math.round(relativeGain * 10) / 10
    };

    const score = Math.round((
      metrics.momentum * 0.15 + metrics.rsi * 0.20 + metrics.supply * 0.20 +
      metrics.sentiment * 0.15 + metrics.volatility * 0.10 +
      metrics.short_risk * 0.10 + metrics.relative_gain * 0.10
    ) * 10) / 10;

    return { metrics, score };
  } catch (e) {
    return null;
  }
}

async function getKoreanData(ticker: string): Promise<{ metrics: Metrics; score: number } | null> {
  try {
    const quote = await yahooFinance.quote(`${ticker}.KS`);
    if (!quote) return null;

    const historical: any[] = await yahooFinance.historical(`${ticker}.KS`, {
      period1: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      interval: '1d'
    });

    if (!historical || historical.length < 20) return null;

    const data = historical.map(h => ({
      close: h.close,
      volume: h.volume
    }));

    return calculateIndicators(data);
  } catch (e) {
    return null;
  }
}

async function getUSData(ticker: string): Promise<{ metrics: Metrics; score: number } | null> {
  const apiKey = process.env.TWELVE_DATA_KEY;
  if (apiKey) {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=200&apikey=${apiKey}`;
      const res = await axios.get(url);
      const data = res.data;

      if (data.status !== 'error' && data.values && data.values.length >= 20) {
        const historical = data.values.map((v: any) => ({
          close: parseFloat(v.close),
          volume: parseFloat(v.volume)
        }));
        return calculateIndicators(historical);
      }
    } catch (e) {
      // twelve data 실패 시 fallback 처리
    }
  }

  // fallback: yahoo finance로 가져오기 (미국/기타 글로벌 코드)
  try {
    const symbol = ticker.toUpperCase();
    const h: any = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      interval: '1d'
    });

    if (!h || (Array.isArray(h) && h.length < 20)) return null;
    const historical = Array.isArray(h) ? h.map((d: any) => ({ close: d.close, volume: d.volume })) : [];
    if (historical.length < 20) return null;
    return calculateIndicators(historical);
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    
    // 데이터가 있는 탭 번호 (첫 번째 탭 = 0)
    const sheet = doc.sheetsByIndex[0]; 
    const rows = await sheet.getRows();
    
    const stockData = rows.map(row => {
      const rowAny = row as any;
      // 가장 안전하게 데이터를 가져오는 로직 (메서드가 없으면 내부 속성으로 접근)
      const raw = (typeof rowAny.toObject === 'function') ? rowAny.toObject() : rowAny._rawData;
      const isArray = Array.isArray(raw);
      
      // 시트 컬럼 양식에 맞춘 데이터 추출
      const name = isArray ? raw[0] : (raw['name'] || raw['Name'] || raw['ticker'] || raw['종목코드'] || rowAny.get('ticker'));
      const scoreValue = isArray ? raw[1] : (raw['score'] || raw['Score'] || raw['greedIndex'] || raw['점수'] || rowAny.get('score'));
      const timeValue = isArray ? raw[3] : (raw['time'] || raw['Time'] || raw['시간'] || rowAny.get('time'));
      const metricsCell = isArray ? raw[4] : (raw['metrics'] || raw['metrics_json'] || raw['지표'] || rowAny.get('metrics'));

      let metricsData = { momentum: 50, rsi: 50, supply: 50, sentiment: 50, volatility: 50, short_risk: 50, relative_gain: 50 };
      if (metricsCell) {
        if (typeof metricsCell === 'string') {
          try { metricsData = JSON.parse(metricsCell); } catch (e) { }
        } else {
          metricsData = metricsCell;
        }
      }

      return {
        name: String(name || '').toUpperCase(),
        score: parseFloat(String(scoreValue || '0')),
        time: timeValue || 'Live',
        metrics: metricsData
      };
    }).filter(s => s.name && s.name.trim() !== ""); // 이름 없는 빈 줄 제거

    // [중요] 특정 검색어(ticker)가 있을 때의 처리
    if (ticker) {
      const found = stockData.find(s => s.name === ticker);
      
      if (!found) {
        // 시트에 없으면 API로 직접 데이터 가져오기
        let apiData: { metrics: Metrics; score: number } | null = null;

        // 1차: 입력된 티커 기준(숫자는 한국, 문자열은 미국)
        if (ticker.match(/^\d+$/)) {
          apiData = await getKoreanData(ticker);
        } else {
          apiData = await getUSData(ticker);
        }

        // 2차: 실패 시 fallback
        if (!apiData) {
          // 미국 종목이라도 yahoo Finance 가격 확인 (TWELVE 키 누락/지원 안될 때)
          apiData = await getUSData(ticker); // 재시도
          if (!apiData) {
            apiData = await getUSData(`${ticker}.KQ`);
            if (!apiData) {
              apiData = await getUSData(`${ticker}.KS`);
            }
          }
          if (!apiData && ticker.match(/^\d+$/)) {
            apiData = await getKoreanData(ticker);
          }
        }

        if (apiData) {
          const now = new Date().toLocaleTimeString('ko-KR', { hour12: false });
          const newStock = {
            name: ticker,
            score: apiData.score,
            time: now,
            metrics: apiData.metrics
          };
          return NextResponse.json([newStock]);
        } else {
          return NextResponse.json({ error: '데이터를 가져올 수 없습니다.' }, { status: 404 });
        }
      }

      return NextResponse.json(found);
    }

    // 검색어가 없으면 전체 리스트 반환
    return NextResponse.json(stockData);

  } catch (error: any) {
    console.error("API 에러:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}