import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const googleAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await googleAuth.getClient() as any;
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID || '',
      range: 'Sheet1!A2',
    });

    const value = response.data.values?.[0]?.[0] || null;
    return NextResponse.json({ greedIndex: value });
  } catch (error) {
    console.error('stock-data API error', error);
    return NextResponse.json({ error: '데이터를 가져오지 못했습니다.' }, { status: 500 });
  }
}
