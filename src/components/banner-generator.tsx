"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { SentinelaChart } from './sentinela-chart';
import { SentinelaBioPanel } from './sentinela-bio-panel';
import { MatchAnalysisPanel } from './match-analysis-panel';
import { Button as ShadButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, Bitcoin, Trophy, ChevronDown } from 'lucide-react';

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://sentinel-crypto-api-production.up.railway.app';
const DEFAULT_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'TAO/USDT', 'SUI/USDT', 'XRP/USDT'];

export const BannerGenerator = () => {
  const [activeBot, setActiveBot] = useState<'crypto' | 'football'>('crypto');
  const [isSyncing, setIsSyncing] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");
  const [availableMatches, setAvailableMatches] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const exportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  const [cryptoData, setCryptoData] = useState({
    symbol: "BTC/USDT",
    price: "75,921.70",
    rsi: 55.7,
    wt: 11.9,
    trend: "Bullish (1H/4H)",
    s_1h: "74,457",
    r_1h: "75,999",
    s_4h: "73,200",
    r_4h: "78,500",
    verdict: "CONSOLIDATION NEUTRAL - No reversal triggers detected at current levels. WaveTrend indicates stability."
  });

  const [footballData, setFootballData] = useState({
    match: "Real Madrid vs Manchester City",
    time: "20:00",
    factors: {
        favorite: "🛡️ Real Madrid or Draw (Conf: 78%)",
        goals: "Over 2.5 (Premium) (Avg: 2.8)",
        ht_goals: "Over 0.5 HT (Avg: 1.1)",
        btts: "💎 Yes (Gold Match)",
        corners: "Over 9.5 Corners (Avg: 10.2)",
        shots: "Over 24.5 (Avg: 26.4)",
        on_target: "Over 8.5 (Avg: 9.1)",
        cards: "Over 3.5 (Avg: 4.2)"
    }
  });

  const onExport = async () => {
    if (exportRef.current === null) return;
    try {
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        pixelRatio: 3,
        width: 1200,
        height: 675,
        style: {
          transform: 'scale(1)',
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `sentinela-${activeBot}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleSync = useCallback(async (symbolOverride?: string) => {
    setIsSyncing(true);
    try {
      if (activeBot === 'crypto') {
        // Busca dados directamente do Railway (sem passar pelo /api/sync)
        const res = await fetch(`${RAILWAY_URL}/latest`);
        if (!res.ok) throw new Error('Railway /latest falhou');
        const json = await res.json();
        const symbols = json.symbols || {};
        const allSyms = Object.keys(symbols);
        if (allSyms.length > 0) setAvailableSymbols(allSyms);

        const sym = symbolOverride || selectedSymbol;
        const botData = symbols[sym] || symbols[allSyms[0]];
        if (botData) {
          const ind4h = botData['4h'] || botData.indicators_4h || {};
          const supports = botData.supports || [];
          const resistances = botData.resistances || [];
          setCryptoData({
            symbol: botData.symbol || sym,
            price: (botData.price || 0).toLocaleString('en-US'),
            rsi: parseFloat((ind4h.rsi || 50).toFixed(1)),
            wt: parseFloat((ind4h.wt1 || 0).toFixed(1)),
            trend: (ind4h.trend || "Neutral") + " (4H)",
            s_1h: supports[0]?.toLocaleString('en-US') || "---",
            r_1h: resistances[0]?.toLocaleString('en-US') || "---",
            s_4h: supports[1]?.toLocaleString('en-US') || supports[0]?.toLocaleString('en-US') || "---",
            r_4h: resistances[1]?.toLocaleString('en-US') || resistances[0]?.toLocaleString('en-US') || "---",
            verdict: botData.ai_text || botData.rev_type || "Sem análise disponível."
          });
          if (botData.symbol) setSelectedSymbol(botData.symbol);
        }

        // Busca gráfico do Binance
        try {
          const binSym = sym.replace('/', '');
          const binRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=1h&limit=500`);
          if (binRes.ok) {
            const klines = await binRes.json();
            setHistoryData(klines.map((k: any) => ({
              time: k[0] / 1000,
              open: parseFloat(k[1]), high: parseFloat(k[2]),
              low: parseFloat(k[3]),  close: parseFloat(k[4])
            })));
          }
        } catch { /* gráfico opcional */ }

      } else {
        // Football: continua a usar /api/sync (requer PC ligado)
        const sym = symbolOverride || selectedMatch;
        const url = `/api/sync?bot=football${sym ? `&symbol=${encodeURIComponent(sym)}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Football sync falhou');
        const data = await response.json();
        const matchData = data.match || data;
        setAvailableMatches(data.allMatches || []);
        setFootballData({
          match: matchData.match,
          time: matchData.time,
          factors: { ...matchData.factors, league: matchData.league, country: matchData.country }
        });
        if (!selectedMatch && matchData.match) setSelectedMatch(matchData.match);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeBot, selectedSymbol, selectedMatch]);

  useEffect(() => {
    handleSync();

    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.offsetWidth;
        const newScale = isZoomed ? 1 : Math.min(1, availableWidth / 1200);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [activeBot, selectedSymbol, selectedMatch, handleSync]);

  return (
     <div className="container mx-auto p-4 lg:p-8 max-w-[1600px]">
        {/* Mobile Control Header (Visible only on small/medium screens) */}
        <div className="lg:hidden mb-6 space-y-4">
           {/* Bot Mode Selector - Mobile Side-by-side */}
           <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
              <button 
                onClick={() => setActiveBot('crypto')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 text-xs font-black rounded-lg transition-all ${activeBot === 'crypto' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                 <Bitcoin className="w-4 h-4" />
                 CRYPTO
              </button>
              <button 
                onClick={() => setActiveBot('football')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 text-xs font-black rounded-lg transition-all ${activeBot === 'football' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                 <Trophy className="w-4 h-4" />
                 SPORTS
              </button>
           </div>

           {/* Mobile Selectors - Large & Tappable */}
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
              {activeBot === 'crypto' ? (
                <div className="space-y-1.5">
                   <Label className="text-slate-500 text-[9px] font-bold uppercase tracking-widest pl-1">Select Market</Label>
                   <div className="relative">
                      <select 
                          value={selectedSymbol}
                          onChange={(e) => setSelectedSymbol(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-sm p-4 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                      >
                          {availableSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-4.5 w-5 h-5 text-sky-500 pointer-events-none" />
                   </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                   <Label className="text-slate-500 text-[9px] font-bold uppercase tracking-widest pl-1">Select Match</Label>
                   <div className="relative">
                      <select 
                          value={selectedMatch}
                          onChange={(e) => setSelectedMatch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-sm p-4 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                      >
                          {availableMatches.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-4.5 w-5 h-5 text-emerald-500 pointer-events-none" />
                   </div>
                </div>
              )}
              
              <div className="flex gap-2">
                 <ShadButton 
                    onClick={() => handleSync()} 
                    disabled={isSyncing}
                    className={`flex-1 font-bold h-12 gap-2 ${activeBot === 'crypto' ? 'bg-sky-600' : 'bg-emerald-600'}`}
                 >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    SYNC DATA
                 </ShadButton>
                 <ShadButton onClick={onExport} className="w-12 h-12 p-0 bg-slate-100 text-slate-950 rounded-lg">
                    <Download className="w-5 h-5 mx-auto" />
                 </ShadButton>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Desktop Sidebar (Hidden on Mobile) */}
           <div className="hidden lg:block lg:col-span-1 space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-fit">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                 <h2 className="font-bold text-slate-100 tracking-tight text-xs uppercase">Dashboard Engine</h2>
              </div>
              
              {/* Mode Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                 <button 
                  onClick={() => setActiveBot('crypto')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-md transition-all ${activeBot === 'crypto' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <Bitcoin className="w-3 h-3" />
                    CRYPTO
                 </button>
                 <button 
                  onClick={() => setActiveBot('football')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-md transition-all ${activeBot === 'football' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <Trophy className="w-3 h-3" />
                    SPORTS
                 </button>
              </div>

              {/* Dynamic Controls based on Bot */}
              <div className="space-y-4 pt-4">
                 {activeBot === 'crypto' && (
                    <>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-bold uppercase mb-1 block">Live Market Selector</Label>
                          <div className="relative">
                              <select 
                                  value={selectedSymbol}
                                  onChange={(e) => setSelectedSymbol(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-[10px] p-2 rounded focus:ring-1 focus:ring-sky-500 outline-none appearance-none"
                              >
                                  {availableSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-600 pointer-events-none" />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-bold uppercase">Price Override</Label>
                          <Input 
                            value={cryptoData.price} 
                            onChange={(e) => setCryptoData({...cryptoData, price: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-sky-400 font-mono text-xs"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-bold uppercase">AI Verdict</Label>
                          <textarea 
                            value={cryptoData.verdict} 
                            onChange={(e) => setCryptoData({...cryptoData, verdict: e.target.value})}
                            className="w-full h-24 p-2.5 rounded-md bg-slate-950 border border-slate-700 text-slate-400 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500 leading-tight"
                          />
                      </div>
                    </>
                 )}

                 {activeBot === 'football' && (
                    <>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-bold uppercase mb-1 block">Live Match Selector</Label>
                          <div className="relative">
                              <select 
                                  value={selectedMatch}
                                  onChange={(e) => setSelectedMatch(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-[10px] p-2 rounded focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                              >
                                  {availableMatches.map(m => <option key={m} value={m} className="bg-slate-950 text-slate-100">{m}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-emerald-500 pointer-events-none" />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-bold uppercase">Match Info</Label>
                          <Input 
                            value={footballData.match} 
                            onChange={(e) => setFootballData({...footballData, match: e.target.value})}
                            className="bg-slate-950 border-slate-700 text-emerald-400 font-bold text-xs"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-bold uppercase">Favorite Weight</Label>
                          <Input 
                            value={footballData.factors.favorite} 
                            onChange={(e) => setFootballData({...footballData, factors: {...footballData.factors, favorite: e.target.value}})}
                            className="bg-slate-950 border-slate-700 text-white text-xs"
                          />
                      </div>
                    </>
                 )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-800 flex flex-col gap-3">
                 <ShadButton 
                    onClick={() => handleSync()} 
                    disabled={isSyncing}
                    className={`w-full font-bold gap-2 mb-2 ${activeBot === 'crypto' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                 >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'SYNCING...' : `REFRESH DATA`}
                 </ShadButton>

                 <ShadButton onClick={onExport} className="w-full bg-slate-100 hover:bg-white text-slate-950 font-black gap-2">
                    <Download className="w-4 h-4" />
                    EXPORT JPG
                 </ShadButton>
              </div>
           </div>

           {/* Preview Area */}
           <div className="lg:col-span-3 space-y-8">
              <Tabs defaultValue="preview" className="w-full">
                 <div className="flex justify-between items-end mb-4">
                    <TabsList className="bg-slate-900 border-slate-800">
                       <TabsTrigger value="preview" className={activeBot === 'crypto' ? 'data-[state=active]:bg-sky-600' : 'data-[state=active]:bg-emerald-600'}>Asset Preview</TabsTrigger>
                       <TabsTrigger value="config" className="opacity-50 pointer-events-none">History</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                       <ShadButton 
                         variant="outline" 
                         size="sm" 
                         onClick={() => setIsZoomed(!isZoomed)}
                         className={`text-[10px] font-bold h-8 gap-2 border-slate-800 ${isZoomed ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                         {isZoomed ? 'AUTO-FIT' : 'REAL SIZE (1200px)'}
                       </ShadButton>
                    </div>
                 </div>

                 <TabsContent value="preview" className="mt-0 ring-offset-background focus-visible:outline-none focus:outline-none">
                    <div ref={containerRef} className={`w-full overflow-hidden pb-8 flex flex-col items-center ${isZoomed ? 'overflow-x-auto justify-start' : 'justify-center'}`}>
                       <div 
                         style={{ 
                           width: '1200px',
                           height: '675px',
                           transform: `scale(${scale})`,
                           transformOrigin: isZoomed ? 'top left' : 'top center',
                           marginBottom: `-${675 * (1 - scale)}px`,
                           transition: 'transform 0.3s ease-out, margin 0.3s ease-out'
                         }}
                       >
                          <div 
                            ref={exportRef}
                            className={`relative w-[1200px] h-[675px] rounded-[1.5rem] lg:rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col transition-all duration-500 antialiased ${activeBot === 'crypto' ? 'bg-slate-950 border-slate-800 p-6 lg:p-12' : 'bg-slate-950 border-emerald-900/50'}`}
                            style={{ 
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale'
                            }}
                          >
                             {/* Background Cinematic effects */}
                             <div className={`absolute inset-0 transition-opacity duration-1000 ${activeBot === 'crypto' ? 'opacity-100' : 'opacity-0'}`} 
                                  style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.12) 0%, transparent 60%)' }} />
                             <div className={`absolute inset-0 transition-opacity duration-1000 ${activeBot === 'football' ? 'opacity-100' : 'opacity-0'}`} 
                                  style={{ backgroundImage: 'radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)' }} />

                             {activeBot === 'crypto' ? (
                                <>
                                   <div className="absolute top-6 lg:top-8 left-6 lg:left-8 flex items-center gap-3 z-50">
                                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-sky-500 rounded-md flex items-center justify-center font-bold text-slate-950 text-xs">S</div>
                                      <div>
                                         <h3 className="text-xs lg:text-sm font-black text-slate-100 leading-none tracking-tighter">SENTINELA AI</h3>
                                         <p className="text-[8px] lg:text-[9px] text-slate-500 font-bold uppercase tracking-tighter italic">FINANCIAL QUANT ENGINE</p>
                                      </div>
                                   </div>
                                   <div className="flex-1 mt-4 mb-2 bg-slate-900/10 rounded-2xl overflow-hidden border border-slate-800/30 relative z-10 min-h-[380px]">
                                      {historyData.length > 0 && (
                                         <SentinelaChart 
                                            data={historyData} 
                                            r_1h={cryptoData.r_1h !== "---" ? parseFloat(cryptoData.r_1h.replace(/,/g, '')) : undefined} 
                                            s_1h={cryptoData.s_1h !== "---" ? parseFloat(cryptoData.s_1h.replace(/,/g, '')) : undefined} 
                                            r_4h={cryptoData.r_4h !== "---" ? parseFloat(cryptoData.r_4h.replace(/,/g, '')) : undefined} 
                                            s_4h={cryptoData.s_4h !== "---" ? parseFloat(cryptoData.s_4h.replace(/,/g, '')) : undefined} 
                                         />
                                      )}
                                   </div>
                                   <SentinelaBioPanel {...cryptoData} />
                                </>
                             ) : (
                                <MatchAnalysisPanel 
                                   match={footballData.match}
                                   time={footballData.time}
                                   factors={footballData.factors}
                                />
                             )}
                          </div>
                       </div>
                    </div>
                 </TabsContent>
              </Tabs>
           </div>
        </div>
     </div>
  );
};
