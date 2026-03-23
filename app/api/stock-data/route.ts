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
    
    // 시트에서 넉넉하게 A1부터 E100까지 읽어옵니다.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1:E100', 
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

    return NextResponse.json({
      ticker: row[0],
      greedIndex: row[1], // 시트 B열에 숫자가 있다고 가정
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}