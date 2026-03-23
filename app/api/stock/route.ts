import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
        try {
          const controlSheet = doc.sheetsByTitle['Control']; 
          if (controlSheet) {
            await controlSheet.loadCells('B2:B2');
            controlSheet.getCellByA1('B2').value = ticker;
            await controlSheet.saveUpdatedCells();
          }
        } catch (e) { console.error("Control 시트 업데이트 실패", e); }
        
        return NextResponse.json({ error: '데이터 생성 요청 중...' }, { status: 404 });
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