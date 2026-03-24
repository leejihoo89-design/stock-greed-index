"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, AlertCircle, Loader2, BarChart3, Activity, Users, Zap, ShieldAlert, Globe, Repeat, LineChart, Newspaper, Clock, Flame, Snowflake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false });

// 🇰🇷 한국 주식 자동 변환 사전
const koreanStockMap: Record<string, string> = {
  "삼성전자": "005930", "SK하이닉스": "000660", "현대차": "005380", "기아": "000270",
  "카카오": "035720", "네이버": "035420", "에코프로": "086520", "에코프로비엠": "247540",
  "LG에너지솔루션": "373220", "엔비디아": "NVDA", "테슬라": "TSLA", "애플": "AAPL", "마이크로소프트": "MSFT"
};

const translations: any = {
  ko: { 
    title: "GLOBAL GREED INDEX", search: "종목명 입력 (예: 삼성전자, TSLA)", loading: "실시간 데이터 조회 중", aiText: "AI가 실제 시장 데이터를 연산하고 있습니다...", welcome: "환영합니다!", welcomeDesc: "우측 상단 검색창에 분석을 원하는 종목을 입력해주세요.", wait: "대기 중...", fear: "공포", greed: "탐욕", insight: "데이터 통합 분석", core: "7대 핵심 지표", chart: "실시간 일봉 차트", news: "실시간 주요 뉴스", error: "❌ 존재하지 않거나 분석 불가한 종목입니다.",
    metrics: { momentum: "모멘텀 (추세)", rsi: "RSI (상대강도)", supply: "메이저 수급", sentiment: "시장 심리", volatility: "변동성 (위험도)", short_risk: "공매도 리스크", relative_gain: "상대적 수익률" },
    status: { extremeFear: "극심한 공포", fear: "공포", neutral: "중립", greed: "탐욕", extremeGreed: "극심한 탐욕" },
    insightDesc: (score:number, status:string, rsi:number, mom:number) => `종합 ${score}pts | ${status} 구간입니다. 차트 기반 실제 RSI(${rsi})와 모멘텀(${mom}) 수치가 강하게 반영되었습니다.`,
    rankingTitle: "🔥 실시간 시장 온도 (검색 데이터 기반)", topGreed: "탐욕 랭킹 Top 5", topFear: "공포 랭킹 Top 5"
  },
  en: { 
    title: "GLOBAL GREED INDEX", search: "Enter ticker (e.g. TSLA)", loading: "Fetching Live Data", aiText: "AI is processing real market data...", welcome: "Welcome!", welcomeDesc: "Enter a ticker in the search bar to begin.", wait: "Waiting...", fear: "FEAR", greed: "GREED", insight: "Data Insight", core: "7-Core Metrics", chart: "LIVE DAILY CHART", news: "Live Latest News", error: "❌ Ticker not found or invalid.",
    metrics: { momentum: "Momentum", rsi: "RSI Strength", supply: "Major Supply", sentiment: "Sentiment", volatility: "Volatility", short_risk: "Short Risk", relative_gain: "Relative Gain" },
    status: { extremeFear: "Extreme Fear", fear: "Fear", neutral: "Neutral", greed: "Greed", extremeGreed: "Extreme Greed" },
    insightDesc: (score:number, status:string, rsi:number, mom:number) => `Total ${score}pts | ${status} zone. Real chart-based RSI (${rsi}) and Momentum (${mom}) are strongly reflected.`,
    rankingTitle: "🔥 Live Market Temperature", topGreed: "Top 5 Greed", topFear: "Top 5 Fear"
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

  // 📡 💡 수정됨: QQQ와 SPY 지수를 순차적으로 안전하게 불러오고 에러를 처리하는 로직
  useEffect(() => {
    const fetchMarketIndices = async () => {
      try {
        const resQqq = await fetch('/api/stock?ticker=QQQ');
        if (resQqq.ok) {
          const jsonQqq = await resQqq.json();
          if (Array.isArray(jsonQqq) && jsonQqq.length > 0) setQqqIndex(String(jsonQqq[0].score));
          else setQqqIndex('-');
        } else {
          setQqqIndex('-'); 
        }

        const resSpy = await fetch('/api/stock?ticker=SPY');
        if (resSpy.ok) {
          const jsonSpy = await resSpy.json();
          if (Array.isArray(jsonSpy) && jsonSpy.length > 0) setSpyIndex(String(jsonSpy[0].score));
          else setSpyIndex('-');
        } else {
          setSpyIndex('-'); 
        }
      } catch (error) {
        setQqqIndex('오류');
        setSpyIndex('오류');
      }
    };

    fetchMarketIndices();
  }, []);

  // 주의: loadData() 함수는 기존에 작성하신 별도 로직이 있어야 동작합니다. 
  // 만약 에러가 난다면 이전에 쓰셨던 loadData() 함수를 컴포넌트 내부나 외부에 선언해주세요.
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).loadData) {
      (window as any).loadData().then((data: any) => {
        const validStocks = data.filter((s:any) => s.score > 0);
        if (validStocks.length > 0) {
          setCurrentStock(validStocks.find((s: any) => s.name.toUpperCase().includes('TSLA')) || validStocks[0]);
        } else {
          setCurrentStock({
            name: t.welcome, score: 50, time: "-",
            metrics: { momentum: 50, rsi: 50, supply: 50, sentiment: 50, volatility: 50, short_risk: 50, relative_gain: 50 }
          });
        }
      });
    } else {
      // loadData가 없을 때 임시 초기값
      setCurrentStock({
        name: t.welcome, score: 50, time: "-",
        metrics: { momentum: 50, rsi: 50, supply: 50, sentiment: 50, volatility: 50, short_risk: 50, relative_gain: 50 }
      });
    }
  }, []);

  // 🚀 새로고침된 초고속 검색 함수
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || isQuerying) return;
    
    let targetTicker = koreanStockMap[searchTerm.trim()] || searchTerm.trim().toUpperCase();
    setIsQuerying(true);

    try {
      const sheetRes = await fetch(`/api/stock-data?ticker=${targetTicker}`, { cache: 'no-store' });
      const sheetData = await sheetRes.json();

      if (sheetRes.ok && sheetData.greedIndex) {
        setCurrentStock({
          name: sheetData.ticker,
          score: Number(sheetData.greedIndex),
          time: "Live Sheet Data",
          metrics: sheetData.metrics 
        });
        setIsQuerying(false);
        setSearchTerm('');
        return; 
      } 
      
      await fetch(`/api/stock?ticker=${targetTicker}`, { cache: 'no-store' });
      
      setTimeout(async () => {
        if (typeof window !== "undefined" && (window as any).loadData) {
          const newData = await (window as any).loadData(); 
          const newlyAdded = newData.find((s: any) => s.name === targetTicker);
          
          if (newlyAdded && newlyAdded.score !== -1) {
            setCurrentStock(newlyAdded);
          } else {
            alert(t.error); 
          }
        } else {
          alert("데이터를 불러올 수 없습니다.");
        }
        setIsQuerying(false);
        setSearchTerm('');
      }, 12000); 

    } catch (err) {
      alert(t.error);
      setIsQuerying(false);
      setSearchTerm('');
    }
  };

  const getTradingViewSymbol = (ticker: string) => {
    if (!ticker || ticker === t.welcome) return "NASDAQ:TSLA";
    const cleanTicker = ticker.replace('.KS', '').replace('.KQ', '').toUpperCase();
    
    if (/^\d+$/.test(cleanTicker)) return `KRX:${cleanTicker}`;
    
    const nasdaqStocks = ["TSLA", "AAPL", "NVDA", "MSFT", "IONQ", "LAES"];
    const nyseStocks = ["PLUG"]; 
    
    if (nasdaqStocks.includes(cleanTicker)) return `NASDAQ:${cleanTicker}`;
    if (nyseStocks.includes(cleanTicker)) return `NYSE:${cleanTicker}`;
    
    return `NASDAQ:${cleanTicker}`;
  };

  const getDynamicInsight = () => {
    if (!currentStock || currentStock.name === t.welcome) {
      return { text: t.welcomeDesc, color: "text-slate-400", isWelcome: true };
    }

    const s = currentStock.score;
    const m = currentStock.metrics || {};
    let statusText = "";
    let statusColor = "";

    if (s >= 75) { statusText = t.status.extremeGreed; statusColor = "text-emerald-400"; }
    else if (s >= 55) { statusText = t.status.greed; statusColor = "text-emerald-500/80"; }
    else if (s >= 45) { statusText = t.status.neutral; statusColor = "text-slate-300"; }
    else if (s >= 25) { statusText = t.status.fear; statusColor = "text-red-400"; }
    else { statusText = t.status.extremeFear; statusColor = "text-red-600"; }

    let detail = "";
    if (m.rsi > 70) detail = "RSI 과매수권으로 단기 조정 가능성이 존재하며,";
    else if (m.rsi < 30) detail = "RSI 과매도권으로 기술적 반등이 기대되나,";
    else detail = "차트상 안정적인 흐름을 유지 중이며,";

    if (m.momentum > 60) detail += " 상승 에너지가 강한 반면";
    else if (m.momentum < 40) detail += " 하락 추세가 우세한 가운데";
    else detail += " 적절한 추세를 유지하고 있으나";

    detail += (m.short_risk > 70) ? " 공매도 압력이 높아 주의가 필요합니다." : " 수급 상황은 비교적 안정적입니다.";

    return { score: s, status: statusText, detail, color: statusColor, isWelcome: false };
  };

  const validStocks = stocks.filter(s => s.score > 0 && s.name !== "환영합니다!" && s.name !== "Welcome!");
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

  if (!currentStock) return <div className="h-screen bg-[#0a0f1c] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-slate-100 p-4 md:p-10 font-sans relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* 🚀 중복 제거된 정상적인 단일 헤더 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 relative">
          <div className="absolute -top-10 left-0 flex items-center gap-4 bg-slate-900/60 px-4 py-1.5 rounded-full border border-slate-800/50 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">TODAY</span>
              <span className="text-[11px] font-black text-emerald-400">124</span>
            </div>
            <div className="w-[1px] h-2 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <Users size={10} className="text-cyan-500" />
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">TOTAL</span>
              <span className="text-[11px] font-black text-cyan-400">12,850</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 md:mt-0">
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
          
          <div className="relative w-full md:w-96 flex flex-col items-end">
            <form onSubmit={handleSearch} className="relative w-full">
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder={t.search} 
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-3.5 px-12 focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm" 
              />
              <Search className="absolute left-4 top-4 text-slate-500" size={18} />
            </form>
            <p className="text-[11px] text-red-400/90 mt-2 font-medium tracking-wide">
              ※ 미국 주식 티커명만 분석 가능합니다 ※
            </p>
          </div>
        </header>

        {/* ✅ 시장 지수 UI (나스닥, 다우 텍스트 및 18px 크기 적용) */}
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
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-20 flex flex-col items-center justify-center backdrop-blur-xl min-h-[500px]">
              <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold mb-2 text-cyan-400">{t.loading}</h2>
              <p className="text-slate-500 text-sm italic">{t.aiText}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-md shadow-2xl">
                  <div className="text-center mb-10">
                    {/* ✅ 종목명 위 20px 텍스트 추가 */}
                    <p className="text-[20px] text-cyan-400 font-bold mb-2">종목 탐욕 지수</p>
                    <h2 className="text-5xl font-black tracking-tight mb-2">{currentStock?.name || t.wait}</h2>
                    <p className="text-slate-500 font-mono text-xs italic">Precision Analytics v1.0 • {currentStock?.time || "-"}</p>
                  </div>
                  <div className="relative w-full max-w-sm mx-auto mb-8">
                    <GaugeComponent value={currentStock?.score || 50} arc={{ width: 0.15, padding: 0.01, subArcs: [{ limit: 25, color: '#ef4444' }, { limit: 45, color: '#f97316' }, { limit: 55, color: '#94a3b8' }, { limit: 75, color: '#22c55e' }, { limit: 100, color: '#10b981' }] }} pointer={{ type: "blob", animationDelay: 0, color: '#fff' }} labels={{ valueLabel: { formatTextValue: (value) => value.toString(), style: { fill: '#fff', fontSize: '45px', fontWeight: '900' } } }} />
                    
                    {/* ✅ 게이지 바 하단 공포/탐욕 16px 텍스트 추가 */}
                    <div className="flex justify-between w-full px-4 mt-2">
                      <span className="text-[16px] font-bold text-red-500">공포(FEAR)</span>
                      <span className="text-[16px] font-bold text-emerald-500">탐욕(GREED)</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/30 mt-8">
                    <div className="flex items-center gap-2 mb-3 text-cyan-400 font-bold text-sm">
                      <BarChart3 size={16}/> {t.insight}
                    </div>
                    {(() => {
                      const insight = getDynamicInsight();
                      if (insight.isWelcome) return <p className="text-slate-400">{insight.text}</p>;
                      return (
                        <p className="leading-relaxed font-medium text-slate-200">
                          종합 {insight.score}pts 
                          <span className={`font-black mx-2 ${insight.color}`}>
                            [{insight.status}]
                          </span> 
                          : {insight.detail}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {currentStock?.name !== t.welcome && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 backdrop-blur-md shadow-2xl h-[450px] flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold text-sm"><LineChart size={18}/> {t.chart}</div>
                    <div className="flex-1 w-full rounded-2xl overflow-hidden bg-[#131722] border border-slate-800">
                      <iframe title="TradingView" src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${getTradingViewSymbol(currentStock.name)}&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=131722&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FSeoul&withdateranges=1&showpopupbutton=1&padding=0`} width="100%" height="100%" style={{ border: "none" }} />
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-6 h-fit sticky top-10">
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-cyan-400"><Zap size={18} /> {t.core}</h3>
                  <div className="space-y-6">
                    {metricsInfo.map((m) => {
                      const score = currentStock?.metrics ? currentStock.metrics[m.key] : 0;
                      return (
                        <div key={m.key}>
                          {/* ✅ 7대 핵심 지표 18px 텍스트 크기 적용 */}
                          <div className="flex justify-between text-[18px] mb-3 font-bold tracking-wider uppercase text-slate-300">
                            <span className="flex items-center gap-2">{m.icon} {m.label}</span>
                            <span className={score >= 50 ? "text-emerald-400" : "text-red-400"}>{score ? score.toFixed(1) : "0.0"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1 }} className={`h-full ${score >= 50 ? "bg-emerald-500" : "bg-red-500"}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {currentStock?.name !== t.welcome && (
                  <div className="bg-slate-900/80 border border-slate-700/50 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-yellow-400"><Newspaper size={18} /> {t.news} <span className="text-[10px] text-slate-500 ml-1 font-normal">(Live RSS)</span></h3>
                    <div className="flex flex-col gap-5">
                      {news.length > 0 ? news.map((item, idx) => (
                        <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group cursor-pointer block p-2 -m-2 rounded-xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50">
                          <h4 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">{item.title}</h4>
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-medium text-slate-500"><span className="flex items-center gap-1 text-emerald-500/80"><Clock size={10} /> Live</span><span className="text-slate-600">|</span><span>News</span></div>
                        </a>
                      )) : <div className="py-4 text-center"><Loader2 className="animate-spin mx-auto text-slate-600 mb-2" size={20} /><p className="text-xs text-slate-500 italic">Finding latest news...</p></div>}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!isQuerying && validStocks.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-md shadow-xl">
            <h3 className="text-xl font-bold mb-8 text-center text-slate-200">{t.rankingTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2 border-b border-emerald-900/50 pb-2"><Flame size={16} /> {t.topGreed}</h4>
                <div className="flex flex-col gap-3">
                  {topGreed.map((stock, i) => (
                    <div key={stock.name} onClick={() => { setSearchTerm(stock.name); }} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 cursor-pointer transition-colors border border-slate-700/30">
                      <span className="font-bold text-slate-300 flex items-center gap-3"><span className="text-emerald-500/50 w-4">{i + 1}</span> {stock.name}</span>
                      <span className="font-mono font-bold text-emerald-400">{stock.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2 border-b border-red-900/50 pb-2"><Snowflake size={16} /> {t.topFear}</h4>
                <div className="flex flex-col gap-3">
                  {topFear.map((stock, i) => (
                    <div key={stock.name} onClick={() => { setSearchTerm(stock.name); }} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 cursor-pointer transition-colors border border-slate-700/30">
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