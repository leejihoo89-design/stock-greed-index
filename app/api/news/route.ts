// app/api/news/route.ts 수정본

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const lang = searchParams.get('lang') || 'en';
  
  if (!ticker || ticker === "환영합니다!" || ticker === "Welcome!") {
    return NextResponse.json([]);
  }

  try {
    // 💡 패치 1: 검색어 뒤에 'stock'을 붙여서 주식 뉴스임을 명시합니다.
    const query = encodeURIComponent(`${ticker} stock`);
    
    // 💡 패치 2: 한국어 설정일 때 뉴스가 안 나오면 영어 뉴스를 가져오도록 '언어 믹스'
    // 만약 영문 티커(IONQ)라면 언어 설정을 en-US로 강제하거나 확장합니다.
    const isEnglishTicker = /^[A-Z]+$/.test(ticker.replace('.', ''));
    const finalLang = isEnglishTicker ? 'en' : lang;
    const finalGl = isEnglishTicker ? 'US' : lang.toUpperCase();

    const rssUrl = `https://news.google.com/rss/search?q=${query}+when:1d&hl=${finalLang}-${finalGl}&gl=${finalGl}&ceid=${finalGl}:${finalLang}`;
    
    const res = await fetch(rssUrl);
    const xml = await res.text();

    const newsItems: any[] = [];
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && newsItems.length < 5) {
      let title = match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").split(" - ")[0];
      const url = match[2];
      newsItems.push({ title, url });
    }

    return NextResponse.json(newsItems);
  } catch (error) {
    return NextResponse.json([]);
  }
}