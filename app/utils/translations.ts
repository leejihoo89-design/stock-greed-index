export const translations = {
  ko: {
    title: "글로벌 탐욕 지수",
    subtitle: "실시간 AI 데이터 분석 엔진",
    searchPlaceholder: "종목명 또는 티커 (예: 삼성전자, AAPL)",
    searchBtn: "분석",
    statusWait: "종목을 검색해 주세요.",
    fear: "공포",
    greed: "탐욕",
    insight: "AI 인사이트",
    insightDesc: "우측 상단 검색창에 분석을 원하는 종목을 입력해주세요."
  },
  en: {
    title: "Global Greed Index",
    subtitle: "Real-time AI Analytics Engine",
    searchPlaceholder: "Ticker or Name (e.g. AAPL, TSLA)",
    searchBtn: "Analyze",
    statusWait: "Please search for a ticker.",
    fear: "Fear",
    greed: "Greed",
    insight: "AI Insight",
    insightDesc: "Enter a stock ticker in the search bar to begin analysis."
  },
  es: {
    title: "Índice de Codicia Global",
    subtitle: "Motor de análisis de datos AI en tiempo real",
    searchPlaceholder: "Ticker o nombre (ej: AAPL, TSLA)",
    searchBtn: "Analizar",
    statusWait: "Por favor, busque un ticker.",
    fear: "Miedo",
    greed: "Codicia",
    insight: "Perspectiva de AI",
    insightDesc: "Ingrese un ticker en la barra de búsqueda para comenzar."
  },
  ja: {
    title: "グローバル強欲指数",
    subtitle: "リアルタイムAIデータ分析エンジン",
    searchPlaceholder: "銘柄名またはティッカー (例: AAPL, TSLA)",
    searchBtn: "分析",
    statusWait: "銘柄を検索してください。",
    fear: "恐怖",
    greed: "強欲",
    insight: "AIインサイト",
    insightDesc: "検索バーに銘柄を入力して分析を開始してください。"
  },
  zh: {
    title: "全球贪婪指数",
    subtitle: "实时 AI 数据分析引擎",
    searchPlaceholder: "股票代码或名称 (如: AAPL, TSLA)",
    searchBtn: "分析",
    statusWait: "请搜索股票代码。",
    fear: "恐惧",
    greed: "贪婪",
    insight: "AI 洞察",
    insightDesc: "在搜索栏输入股票代码以开始分析。"
  }
};

export type Language = keyof typeof translations;