import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { ticker, indicators, lang } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ insight: "API Key 미설정 (.env.local 확인)" });
    }

    // 1. 💡 [핵심 개선] API 버전을 'v1'으로 강제 고정합니다. (v1beta의 404 에러 회피)
    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. 모델을 불러올 때 가장 표준적인 이름을 사용합니다.
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' } // 👈 이 부분이 404 에러를 해결하는 마법의 코드입니다.
    );

    const prompt = `
      당신은 20년 경력의 수석 주식 전략가입니다. 
      아래 종목(${ticker})의 지표를 분석하여 전문가 의견 5줄을 작성하세요.
      - 데이터: 모멘텀(${indicators.momentum}), RSI(${indicators.rsi}), 공매도(${indicators.short_risk})
      - 반드시 ${lang === 'ko' ? '한국어' : '영어'}로 답변하세요.
    `;

    // 3. 실행 및 응답 추출
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ insight: text });

  } catch (error: any) {
    console.error("❌ Gemini API 최종 에러:", error);
    
    // 만약 1.5-flash가 정말 안 된다면, 구형 모델인 gemini-pro로 한 번 더 시도해볼 수 있습니다.
    return NextResponse.json({ 
      insight: `분석 실패: 구글 서버가 모델을 찾을 수 없습니다. (에러: ${error.message})` 
    });
  }
}