import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 1. 사용자가 검색창에 입력한 종목명 가져오기 (예: ?ticker=TSLA)
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // 2. 시트의 A열부터 E열까지 넉넉하게 읽어옵니다.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A1:E100', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '시트에 데이터가 없습니다.' }, { status: 404 });
    }

    // 3. 사용자가 입력한 종목(ticker)이 몇 번째 줄에 있는지 찾습니다.
    const row = rows.find(r => r[0]?.toUpperCase() === ticker);

    if (!row) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 4. 찾은 줄에서 데이터를 뽑아냅니다. (예: A열=종목명, B열=지수)
    return NextResponse.json({
      ticker: row[0],
      greedIndex: row[1], // B열에 숫자가 있다고 가정
      status: row[2]      // C열에 상태가 있다고 가정
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}