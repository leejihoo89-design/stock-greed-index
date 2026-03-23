import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. 구글 인증 설정
  const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

    const sheets = google.sheets({ version: 'v4', auth });
    
    // 2. 구글 시트 데이터 읽기
    // 지후님의 시트 이름이 'Sheet1'이 맞는지 꼭 확인하세요!
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A2', // 탐욕지수 숫자가 들어있는 셀 범위
    });

    const value = response.data.values?.[0][0];

    return NextResponse.json({ greedIndex: value });
  } catch (error: any) {
    console.error('구글 시트 에러:', error);
    return NextResponse.json({ error: '데이터를 가져오지 못했습니다.', details: error.message }, { status: 500 });
  }
}