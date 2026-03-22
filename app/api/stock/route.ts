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
      // google-spreadsheet v5+는 row.toObject()를 권장
      const rowAny = row as any;
      const raw = (typeof rowAny.toObject === 'function') ? rowAny.toObject() : rowAny._rawData;
      const isArray = Array.isArray(raw);
      const name = isArray ? raw[0] : raw['name'] || raw['Name'] || raw['ticker'];
      const scoreValue = isArray ? raw[1] : raw['score'] || raw['Score'] || raw['greedIndex'];
      const detailValue = isArray ? raw[2] : raw['detail'] || raw['Detail'];
      const timeValue = isArray ? raw[3] : raw['time'] || raw['Time'];
      const metricsCell = isArray ? raw[4] : raw['metrics'] || raw['metrics_json'] || raw['Metrics'];

      let metricsData = null;
      if (metricsCell) {
        if (typeof metricsCell === 'string') {
          try { metricsData = JSON.parse(metricsCell); } catch (e) { }
        } else {
          metricsData = metricsCell;
        }
      }

      return {
        name,
        score: parseFloat(scoreValue ?? '0'),
        detail: detailValue || '',
        time: timeValue || '',
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