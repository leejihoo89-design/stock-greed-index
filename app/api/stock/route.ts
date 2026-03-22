import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

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
    
    const sheet = doc.sheetsByIndex[0]; // Sheet1
    const rows = await sheet.getRows();
    
    const stockData = rows.map(row => {
      const raw = row._rawData;
      let metricsData = null;
      // 5번째 열(raw[4])에 파이썬이 세부 지표를 JSON으로 넣어줄 겁니다.
      if (raw[4]) {
        try { metricsData = JSON.parse(raw[4]); } catch (e) {}
      }
      return {
        name: raw[0],
        score: parseFloat(raw[1]),
        detail: raw[2],
        time: raw[3],
        metrics: metricsData
      };
    });

    if (ticker) {
      const exists = stockData.find(s => s.name === ticker);
      if (!exists) {
        const controlSheet = doc.sheetsByTitle['Control']; 
        if (controlSheet) {
          await controlSheet.loadCells('B2:B2');
          controlSheet.getCellByA1('B2').value = ticker;
          await controlSheet.saveUpdatedCells();
        }
      }
    }

    return NextResponse.json(stockData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}