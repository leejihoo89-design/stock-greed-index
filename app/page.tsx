"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, BarChart3, Activity, Users, Zap, ShieldAlert, Globe, Repeat, LineChart, Newspaper, Clock, Flame, Snowflake, Sparkles, Share2, Copy, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false });

const koreanStockMap: Record<string, string> = {
  "삼성전자": "005930", "SK하이닉스": "000660", "현대차": "005380", "기아": "000270",
  "카카오": "035720", "네이버": "035420", "에코프로": "086520", "에코프로비엠": "247540",
  "LG에너지솔루션": "373220", "엔비디아": "NVDA", "테슬라": "TSLA", "애플": "AAPL", "마이크로소프트": "MSFT"
};

// ✅ 다국어 번역 데이터
const translations: any = {
  ko: { 
    title: "GLOBAL GREED INDEX", search: "종목명 입력 (예: TSLA, IONQ 과 같이 티커명 입력)", loading: "실시간 데이터 조회 중", aiText: "AI가 실제 시장 데이터를 연산하고 있습니다...", welcome: "환영합니다!", welcomeDesc: "우측 상단 검색창에 분석을 원하는 종목을 입력해주세요.", wait: "대기 중...", fear: "공포", greed: "탐욕", insight: "데이터 통합 분석", core: "7대 핵심 지표", chart: "실시간 일봉 차트", news: "실시간 주요 뉴스", error: "❌ 존재하지 않거나 분석 불가한 종목입니다.",
    metrics: { momentum: "모멘텀 (추세)", rsi: "RSI (상대강도)", supply: "메이저 수급", sentiment: "시장 심리", volatility: "변동성 (위험도)", short_risk: "공매도 리스크", relative_gain: "상대적 수익률" },
    status: { extremeFear: "극심한 공포", fear: "공포", neutral: "중립", greed: "탐욕", extremeGreed: "극심한 탐욕" },
    rankingTitle: "🔥 실시간 시장 온도 (검색 데이터 기반)", topGreed: "탐욕 랭킹 Top 5", topFear: "공포 랭킹 Top 5"
  },
  en: { 
    title: "GLOBAL GREED INDEX", search: "Enter ticker (e.g. TSLA)", loading: "Fetching Live Data", aiText: "AI is processing real market data...", welcome: "Welcome!", welcomeDesc: "Enter a ticker in the search bar to begin.", wait: "Waiting...", fear: "FEAR", greed: "GREED", insight: "Data Insight", core: "7-Core Metrics", chart: "LIVE DAILY CHART", news: "Live Latest News", error: "❌ Ticker not found or invalid.",
    metrics: { momentum: "Momentum", rsi: "RSI Strength", supply: "Major Supply", sentiment: "Sentiment", volatility: "Volatility", short_risk: "Short Risk", relative_gain: "Relative Gain" },
    status: { extremeFear: "Extreme Fear", fear: "Fear", neutral: "Neutral", greed: "Greed", extremeGreed: "Extreme Greed" },
    rankingTitle: "🔥 Live Market Temperature", topGreed: "Top 5 Greed", topFear: "Top 5 Fear"
  },
  es: {
    title: "GLOBAL GREED INDEX", search: "Ingrese el ticker (ej. TSLA)", loading: "Obteniendo datos en vivo", aiText: "La IA está procesando datos del mercado...", welcome: "¡Bienvenido!", welcomeDesc: "Ingrese un ticker en la barra de búsqueda.", wait: "Esperando...", fear: "MIEDO", greed: "CODICIA", insight: "Análisis de Datos", core: "7 Métricas Clave", chart: "Gráfico Diario en Vivo", news: "Últimas Noticias", error: "❌ Ticker no encontrado.",
    metrics: { momentum: "Impulso", rsi: "Fuerza RSI", supply: "Oferta Mayor", sentiment: "Sentimiento", volatility: "Volatilidad", short_risk: "Riesgo en Corto", relative_gain: "Ganancia Relativa" },
    status: { extremeFear: "Miedo Extremo", fear: "Miedo", neutral: "Neutral", greed: "Codicia", extremeGreed: "Codicia Extrema" },
    rankingTitle: "🔥 Temperatura del Mercado", topGreed: "Top 5 Codicia", topFear: "Top 5 Miedo"
  },
  ja: {
    title: "GLOBAL GREED INDEX", search: "ティッカーを入力 (例: TSLA)", loading: "ライブデータを取得中", aiText: "AIが市場データを処理しています...", welcome: "ようこそ！", welcomeDesc: "検索バーにティッカーを入力してください。", wait: "待機中...", fear: "恐怖", greed: "強欲", insight: "データ分析", core: "7つの主要指標", chart: "ライブ日足チャート", news: "最新ニュース", error: "❌ 見つからないか無効な銘柄です。",
    metrics: { momentum: "モメンタム", rsi: "RSI強度", supply: "主要需給", sentiment: "市場心理", volatility: "ボラティリティ", short_risk: "空売りリスク", relative_gain: "相対収益率" },
    status: { extremeFear: "極度の恐怖", fear: "恐怖", neutral: "中立", greed: "強欲", extremeGreed: "極度の強欲" },
    rankingTitle: "🔥 ライブ市場温度", topGreed: "強欲トップ5", topFear: "恐怖トップ5"
  },
  zh: {
    title: "GLOBAL GREED INDEX", search: "输入股票代码 (如: TSLA)", loading: "正在获取实时数据", aiText: "AI正在处理市场数据...", welcome: "欢迎！", welcomeDesc: "请在搜索栏中输入股票代码。", wait: "等待中...", fear: "恐惧", greed: "贪婪", insight: "数据分析", core: "7大核心指标", chart: "实时日线图", news: "最新实时新闻", error: "❌ 股票代码未找到或无效。",
    metrics: { momentum: "动量 (趋势)", rsi: "RSI强度", supply: "主力资金", sentiment: "市场情绪", volatility: "波动率 (风险)", short_risk: "做空风险", relative_gain: "相对收益" },
    status: { extremeFear: "极度恐惧", fear: "恐惧", neutral: "中立", greed: "贪婪", extremeGreed: "极度贪婪" },
    rankingTitle: "🔥 实时市场温度", topGreed: "贪婪榜 Top 5", topFear: "恐惧榜 Top 5"
  }
};

export default function GreedDashboard() {
  const [lang, setLang] = useState('ko');
  const t = translations[lang] || translations['ko']; 
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStock, setCurrentStock] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [news, setNews] = useState<any[]>([]);
  
  const [qqqIndex, setQqqIndex] = useState<string>('로딩 중...');
  const [spyIndex, setSpyIndex] = useState<string>('로딩 중...');
  const [visitors, setVisitors] = useState({ today: '...', total: '...' });

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const todayStr = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/[^0-9]/g, '');
        const [totalRes, todayRes] = await Promise.all([
          fetch('https://api.counterapi.dev/v1/stockgreed_app/total/up'),
          fetch(`https://api.counterapi.dev/v1/stockgreed_app/today_${todayStr}/up`)
        ]);
        const totalData = await totalRes.json();
        const todayData = await todayRes.json();
        setVisitors({ today: todayData.count.toLocaleString(), total: totalData.count.toLocaleString() });
      } catch (e) { setVisitors({ today: '1', total: '1' }); }
    };
    fetchVisitors();
  }, []);

  useEffect(() => {
    const fetchMarketIndices = async () => {
      try {
        const [resQqq, resSpy] = await Promise.all([
          fetch('/api/market?ticker=QQQ'),
          fetch('/api/market?ticker=SPY')
        ]);
        if (resQqq.ok) {
          const j = await resQqq.json();
          setQqqIndex(String(j.score));
        }
        if (resSpy.ok) {
          const j = await resSpy.json();
          setSpyIndex(String(j.score));
        }
      } catch (e) { setQqqIndex('오류'); setSpyIndex('오류'); }
    };
    fetchMarketIndices();
  }, []);

  useEffect(() => {
    const initLoad = async () => {
      setIsQuerying(true);
      try {
        const res = await fetch('/api/market?ticker=TSLA');
        const data = await res.json();
        if (data.score) {
          setCurrentStock(data);
          setStocks([data]);
        }
      } catch (e) {
        console.error("초기 로드 실패");
      } finally {
        setIsQuerying(false);
      }
    };
    initLoad();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      if (!currentStock?.name || currentStock?.name === t.welcome) return;
      try {
        const res = await fetch(`/api/news?ticker=${encodeURIComponent(currentStock.name)}&lang=${lang}`);
        if (res.ok) setNews(await res.json());
      } catch (e) { setNews([]); }
    };
    fetchNews();
  }, [currentStock?.name, lang, t.welcome]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || isQuerying) return;
    let target = koreanStockMap[searchTerm.trim()] || searchTerm.trim().toUpperCase();
    setIsQuerying(true);
    try {
      const res = await fetch(`/api/market?ticker=${target}`, { cache: 'no-store' });
      const data = await res.json();
      if (data && data.score !== -1) {
        setCurrentStock(data);
        setStocks(prev => {
          const newStocks = prev.filter(s => s.name !== data.name);
          return [...newStocks, data];
        });
      } else alert(t.error);
    } catch (err) { alert(t.error); }
    finally { setIsQuerying(false); setSearchTerm(''); }
  };

  const getDynamicInsight = () => {
    if (!currentStock || currentStock?.name === t.welcome) return { text: t.welcomeDesc, color: "text-slate-400", isWelcome: true };
    const s = currentStock.score;
    const m = currentStock.metrics || {};
    let status = "", color = "";
    if (s >= 75) { status = t.status.extremeGreed; color = "text-emerald-400"; }
    else if (s >= 55) { status = t.status.greed; color = "text-emerald-500/80"; }
    else if (s >= 45) { status = t.status.neutral; color = "text-slate-300"; }
    else if (s >= 25) { status = t.status.fear; color = "text-red-400"; }
    else { status = t.status.extremeFear; color = "text-red-600"; }
    
    let detail = m.rsi > 70 ? "현재 RSI 지표상 과매수 구간에 진입하여 단기 조정을 경계해야 하며," : m.rsi < 30 ? "RSI가 과매도 상태로 기술적 반등 가능성이 열려 있는 구간이며," : "차트 흐름이 안정적인 중립 궤도 내에서 움직이고 있으며,";
    detail += m.momentum > 60 ? " 강력한 상승 모멘텀이 시세를 견인하고 있으나" : m.momentum < 40 ? " 하락 압력이 우세하여 보수적인 접근이 필요하나" : " 적절한 추세 지속성을 유지하고 있으나";
    detail += m.short_risk > 70 ? " 높은 공매도 리스크가 상존하므로 수급 변화에 주의하십시오." : " 수급 및 공매도 상황은 비교적 안정적인 편입니다.";
    
    return { score: s, status, detail, color, isWelcome: false };
  };

  const validStocks = stocks.filter(s => s.score > 0 && s.name !== t.welcome);
  const sortedByScore = [...validStocks].sort((a, b) => b.score - a.score);
  const topGreed = sortedByScore.slice(0, 5);
  const topFear = [...validStocks].sort((a, b) => a.score - b.score).slice(0, 5);

  const metricsInfo = [
    { label: t.metrics.momentum, icon: <Zap size={14} />, key: "momentum" },
    { label: t.metrics.rsi, icon: <Activity size={14} />, key: "rsi" },
    { label: t.metrics.supply, icon: <Users size={14} />, key: "supply" },
    { label: t.metrics.sentiment, icon: <TrendingUp size={14} />, key: "sentiment" },
    { label: t.metrics.volatility, icon: <ShieldAlert size={14} />, key: "volatility" },
    { label: t.metrics.short_risk, icon: <Repeat size={14} />, key: "short_risk" },
    { label: t.metrics.relative_gain, icon: <Globe size={14} />, key: "relative_gain" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-slate-100 p-4 md:p-10 font-sans relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* 헤더 영역 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 relative">
          <div className="absolute -top-10 left-0 flex items-center gap-4 bg-slate-900/60 px-4 py-1.5 rounded-full border border-slate-800/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Today</span>
              <span className="text-[11px] font-black text-emerald-400">{visitors.today}</span>
            </div>
            <div className="w-[1px] h-2 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <Users size={10} className="text-cyan-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
              <span className="text-[11px] font-black text-cyan-400">{visitors.total}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 md:mt-0">
            <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {t.title}
            </h1>
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)} 
              className="bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-xl px-3 py-1.5 text-sm font-bold outline-none cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <option value="ko">🇰🇷 KOR</option>
              <option value="en">🇺🇸 ENG</option>
              <option value="es">🇪🇸 ESP</option>
              <option value="ja">🇯🇵 JPN</option>
              <option value="zh">🇨🇳 CHN</option>
            </select>
          </div>
          
          <div className="relative w-full md:w-96 flex flex-col items-end mt-4 md:mt-0">
            <form onSubmit={handleSearch} className="relative w-full">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-3.5 px-12 focus:ring-2 focus:ring-cyan-500 outline-none text-sm" />
              <Search className="absolute left-4 top-4 text-slate-500" size={18} />
            </form>
          </div>
        </header>

        {/* 시장 지수 UI (나스닥, 다우) */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="rounded-[2rem] border border-cyan-500/30 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-6 text-center h-36 flex flex-col justify-center items-center">
            <p className="text-[18px] text-cyan-400 font-black mb-1 tracking-widest uppercase">나스닥 지수(QQQ)</p>
            <p className="text-6xl font-black text-emerald-400">{qqqIndex}</p>
          </div>
          <div className="rounded-[2rem] border border-purple-500/30 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-6 text-center h-36 flex flex-col justify-center items-center">
            <p className="text-[18px] text-purple-400 font-black mb-1 tracking-widest uppercase">다우 지수(S&P 500 지수)</p>
            <p className="text-6xl font-black text-emerald-400">{spyIndex}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isQuerying ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-20 flex flex-col items-center justify-center min-h-[500px]">
              <Loader2 className="animate-spin text-cyan-500 mb-6" size={48} />
              <h2 className="text-xl font-bold mb-2 text-cyan-400">{t.loading}</h2>
              <p className="text-slate-500 text-sm italic">{t.aiText}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 왼쪽 2칸 (차트 및 메인 지표) */}
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative">
                  <div className="text-center mb-10">
                    <p className="text-[20px] text-cyan-400 font-bold mb-2">종목 탐욕 지수</p>
                    <h2 className="text-5xl font-black tracking-tight mb-2">{currentStock?.name}</h2>
                    <p className="text-slate-500 font-mono text-xs italic">Precision Analytics v1.0 • {currentStock?.time || "Real-time"}</p>
                  </div>
                  
                  {/* ✅ 수정된 게이지 바 (초기 디자인 복구 + 우측 5단계 범례 추가) */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-10 mb-8">
                    
                    {/* 게이지 차트 (왼쪽) */}
                    <div className="relative w-full max-w-sm flex-1">
                      <GaugeComponent 
                        value={currentStock?.score || 50} 
                        arc={{ 
                          width: 0.15, 
                          padding: 0.01, 
                          subArcs: [
                            { limit: 25, color: '#ef4444' }, // 극심한 공포
                            { limit: 45, color: '#f97316' }, // 공포
                            { limit: 55, color: '#94a3b8' }, // 중립
                            { limit: 75, color: '#22c55e' }, // 탐욕
                            { limit: 100, color: '#10b981' }  // 극심한 탐욕
                          ] 
                        }} 
                        pointer={{ 
                          type: "blob", // ✅ 바늘 삭제, 처음의 동그란 점(blob)으로 복구
                          color: '#fff' 
                        }} 
                        labels={{ 
                          valueLabel: { 
                            formatTextValue: (v) => v.toString(), 
                            style: { fill: '#fff', fontSize: '45px', fontWeight: '900' } // ✅ 숫자 중앙 배치 복구
                          },
                          tickLabels: {
                            type: "outer",
                            ticks: [{ value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 }],
                            defaultTickValueConfig: { style: { fontSize: '10px', fill: '#64748b' } }
                          }
                        }} 
                      />
                      {/* 원래 위치의 공포/탐욕 텍스트 복구 */}
                      <div className="flex justify-between w-full px-4 mt-2">
                        <span className="text-[16px] font-bold text-red-500">{t.fear}</span>
                        <span className="text-[16px] font-bold text-emerald-500">{t.greed}</span>
                      </div>
                    </div>

                    {/* 5단계 색상 표기 범례 (오른쪽) */}
                    <div className="flex flex-col gap-4 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 min-w-[180px]">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#ef4444] rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        <span className="text-sm font-bold text-slate-300">극심한 공포</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#f97316] rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                        <span className="text-sm font-bold text-slate-300">공포</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#94a3b8] rounded-sm shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div>
                        <span className="text-sm font-bold text-slate-300">중립</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#22c55e] rounded-sm shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-sm font-bold text-slate-300">탐욕</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#10b981] rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-sm font-bold text-slate-300">극심한 탐욕</span>
                      </div>
                    </div>

                  </div>
                  
                  <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-3 text-cyan-400 font-bold text-sm"><BarChart3 size={16}/> {t.insight}</div>
                    {(() => {
                      const ins = getDynamicInsight();
                      return <p className="leading-relaxed font-medium text-slate-200">종합 {ins.score}pts <span className={`font-black mx-2 ${ins.color}`}>[{ins.status}]</span> : {ins.detail}</p>;
                    })()}
                  </div>
                </div>

                {currentStock?.name && currentStock.name !== t.welcome && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 h-[450px] flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold text-sm"><LineChart size={18}/> {t.chart}</div>
                    <div className="flex-1 w-full rounded-2xl overflow-hidden bg-[#131722] border border-slate-800">
                      <iframe key={currentStock.name} title="TradingView" src={`https://s.tradingview.com/widgetembed/?symbol=${currentStock.name}&interval=D&hidesidetoolbar=1&symboledit=0&theme=dark&style=1&timezone=Asia%2FSeoul&withdateranges=1`} width="100%" height="100%" style={{ border: "none" }} />
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* 오른쪽 1칸 (7대 지표, 뉴스) */}
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-6">
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-cyan-400 uppercase tracking-tighter"><Zap size={18} /> {t.core}</h3>
                  <div className="space-y-6">
                    {metricsInfo.map((m) => {
                      const score = currentStock?.metrics ? currentStock.metrics[m.key] : 0;
                      return (
                        <div key={m.key}>
                          <div className="flex justify-between text-[18px] mb-3 font-bold uppercase text-slate-300">
                            <span className="flex items-center gap-2">{m.icon} {m.label}</span>
                            <span className={score >= 50 ? "text-emerald-400" : "text-red-400"}>{score ? score.toFixed(1) : "0.0"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1 }} className={`h-full ${score >= 50 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-700/50 rounded-[2.5rem] p-8 shadow-xl max-h-[500px] overflow-hidden flex flex-col">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-yellow-400 uppercase tracking-tighter"><Newspaper size={18} /> {t.news}</h3>
                  <div className="flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
                    {news.length > 0 ? news.map((item: any, idx: number) => (
                      <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group block p-2 rounded-xl hover:bg-slate-800/50">
                        <h4 className="text-[13px] font-semibold text-slate-200 group-hover:text-cyan-400 line-clamp-2">{item.title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-slate-500 uppercase"><Clock size={10} /> {item.date || "Just Now"}</div>
                      </a>
                    )) : (
                      <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-700 mb-2" /><p className="text-[10px] text-slate-600 italic">Finding news...</p></div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 랭킹 UI */}
        {!isQuerying && validStocks.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-md shadow-xl">
            <h3 className="text-xl font-bold mb-8 text-center text-slate-200">{t.rankingTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* 탐욕 랭킹 */}
              <div>
                <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2 border-b border-emerald-900/50 pb-2"><Flame size={16} /> {t.topGreed}</h4>
                <div className="flex flex-col gap-3">
                  {topGreed.map((stock, i) => (
                    <div key={`greed-${stock.name}-${i}`} onClick={() => setSearchTerm(stock.name)} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 cursor-pointer transition-colors border border-slate-700/30">
                      <span className="font-bold text-slate-300 flex items-center gap-3"><span className="text-emerald-500/50 w-4">{i + 1}</span> {stock.name}</span>
                      <span className="font-mono font-bold text-emerald-400">{stock.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 공포 랭킹 */}
              <div>
                <h4 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2 border-b border-red-900/50 pb-2"><Snowflake size={16} /> {t.topFear}</h4>
                <div className="flex flex-col gap-3">
                  {topFear.map((stock, i) => (
                    <div key={`fear-${stock.name}-${i}`} onClick={() => setSearchTerm(stock.name)} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 cursor-pointer transition-colors border border-slate-700/30">
                      <span className="font-bold text-slate-300 flex items-center gap-3"><span className="text-red-500/50 w-4">{i + 1}</span> {stock.name}</span>
                      <span className="font-mono font-bold text-red-400">{stock.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </main>
  );
}