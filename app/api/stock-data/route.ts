import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// ⭐ 핵심 추가: Vercel아, 이 API는 데이터가 실시간으로 변하니까 절대 캐시(기억)하지 마!
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ⭐ 수정 1: A열부터 J열까지 넉넉하게 읽어옵니다. (C~I열의 7대 지표를 포함하기 위해)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1:J100', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '시트에 데이터가 없습니다.' }, { status: 404 });
    }

    // 종목 찾기
    const row = rows.find(r => r[0]?.toUpperCase() === ticker);

    if (!row) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    // ⭐ 수정 2: 찾은 줄에서 7대 지표 데이터를 뽑아서 함께 반환합니다.
    return NextResponse.json({
      ticker: row[0],             // A열: 종목명
      greedIndex: row[1],         // B열: 탐욕 지수
      metrics: {
        momentum: Number(row[2]) || 50,      // C열: 모멘텀
        rsi: Number(row[3]) || 50,           // D열: RSI
        supply: Number(row[4]) || 50,        // E열: 수급
        sentiment: Number(row[5]) || 50,     // F열: 심리
        volatility: Number(row[6]) || 50,    // G열: 변동성
        short_risk: Number(row[7]) || 50,    // H열: 공매도 리스크
        relative_gain: Number(row[8]) || 50  // I열: 상대 수익률
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}