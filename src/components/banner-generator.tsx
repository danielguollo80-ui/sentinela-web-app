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

const RAILWAY_URL = 'https://sentinel-crypto-api-production.up.railway.app';
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
        const sym = symbolOverride || selectedSymbol;
        const url = `/api/sync?bot=crypto${sym ? `&symbol=${encodeURIComponent(sym)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Falha ao buscar dados do Redis');
        const json = await res.json();
        
        const allSyms = DEFAULT_SYMBOLS.filter(s => json.allMatches?.includes(s));
        if (allSyms.length > 0) {
            setAvailableSymbols(allSyms);
        } else {
            setAvailableSymbols(DEFAULT_SYMBOLS);
        }

        const botData = json.match;
        if (botData) {
          const ind4h = botData['4h'] || {};
          const fmt = (v: number | undefined) => v ? v.toLocaleString('en-US') : '---';
          setCryptoData({
            symbol: botData.symbol || sym,
            price: (botData.price || 0).toLocaleString('en-US'),
            rsi: parseFloat((ind4h.rsi || 50).toFixed(1)),
            wt: parseFloat((ind4h.wt1 || 0).toFixed(1)),
            trend: (botData.confluence_label || ind4h.wt_dir || "Neutral") + " (4H)",
            s_1h: fmt(botData.s_1h),
            r_1h: fmt(botData.r_1h),
            s_4h: fmt(botData.s_4h),
            r_4h: fmt(botData.r_4h),
            verdict: botData.rev_type || botData.confluence_label || "Sem análise disponível.",
            setup: botData.setup
          });
          if (botData.symbol || sym) setSelectedSymbol(botData.symbol || sym);
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
        {/* Quick Actions Toolbar - NEW */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 glass-dark rounded-2xl border border-white/10 glow-blue">
           <div className="flex items-center gap-4">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                 <button 
                  onClick={() => setActiveBot('crypto')}
                  className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black rounded-lg transition-all ${activeBot === 'crypto' ? 'bg-sentinela-blue text-white shadow-lg glow-blue' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <Bitcoin className="w-4 h-4" />
                    CRYPTO
                 </button>
                 <button 
                  onClick={() => setActiveBot('football')}
                  className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black rounded-lg transition-all ${activeBot === 'football' ? 'bg-sentinela-emerald text-white shadow-lg glow-emerald' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <Trophy className="w-4 h-4" />
                    SPORTS
                 </button>
              </div>

              <div className="h-8 w-px bg-white/10 hidden md:block" />

              {/* Selector based on mode */}
              <div className="hidden md:flex items-center gap-3">
                 <Label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Select {activeBot === 'crypto' ? 'Asset' : 'Match'}:</Label>
                 <div className="relative min-w-[220px]">
                    <select 
                        value={activeBot === 'crypto' ? selectedSymbol : selectedMatch}
                        onChange={(e) => activeBot === 'crypto' ? setSelectedSymbol(e.target.value) : setSelectedMatch(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white text-xs p-2.5 rounded-lg focus:ring-2 focus:ring-sentinela-blue outline-none appearance-none font-bold"
                    >
                        {activeBot === 'crypto' 
                           ? availableSymbols.map(s => <option key={s} value={s}>{s}</option>)
                           : availableMatches.map(m => <option key={m} value={m}>{m}</option>)
                        }
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 w-4 h-4 ${activeBot === 'crypto' ? 'text-sentinela-blue' : 'text-sentinela-emerald'} pointer-events-none`} />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-3 w-full sm:w-auto">
              <ShadButton 
                 onClick={() => handleSync()} 
                 disabled={isSyncing}
                 className={`flex-1 sm:flex-none font-black h-12 px-8 gap-2 transition-all active:scale-95 ${activeBot === 'crypto' ? 'bg-sentinela-blue hover:bg-sentinela-blue/80 glow-blue' : 'bg-sentinela-emerald hover:bg-sentinela-emerald/80 glow-emerald'}`}
              >
                 <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                 {isSyncing ? 'SINCRONIZANDO...' : 'ATUALIZAR DADOS'}
              </ShadButton>

              <ShadButton 
                 onClick={onExport} 
                 className="flex-1 sm:flex-none h-12 px-8 bg-white hover:bg-slate-100 text-slate-950 font-black gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                 <Download className="w-5 h-5" />
                 BAIXAR PARA TWITTER (X)
              </ShadButton>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Desktop Sidebar - Refined */}
           <div className="hidden lg:block lg:col-span-1 space-y-6 glass-dark p-6 rounded-2xl border border-white/5 h-fit sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                 <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeBot === 'crypto' ? 'bg-sentinela-blue glow-blue' : 'bg-sentinela-emerald glow-emerald'}`} />
                 <h2 className="font-black text-white tracking-tighter text-sm uppercase">Manual Editor</h2>
              </div>
              
              {/* Dynamic Controls based on Bot */}
              <div className="space-y-4 pt-2">
                 {activeBot === 'crypto' && (
                    <>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">Price Override</Label>
                          <Input 
                            value={cryptoData.price} 
                            onChange={(e) => setCryptoData({...cryptoData, price: e.target.value})}
                            className="bg-slate-950 border-white/10 text-sentinela-blue font-mono text-sm h-11 focus:ring-sentinela-blue/50"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest">AI Analysis (Text)</Label>
                          <textarea 
                            value={cryptoData.verdict} 
                            onChange={(e) => setCryptoData({...cryptoData, verdict: e.target.value})}
                            className="w-full h-32 p-3 rounded-xl bg-slate-950 border border-white/10 text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sentinela-blue/50 leading-relaxed resize-none"
                          />
                      </div>
                    </>
                 )}

                 {activeBot === 'football' && (
                    <>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Match Name</Label>
                          <Input 
                            value={footballData.match} 
                            onChange={(e) => setFootballData({...footballData, match: e.target.value})}
                            className="bg-slate-950 border-white/10 text-sentinela-emerald font-bold text-sm h-11 focus:ring-sentinela-emerald/50"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Verdict Strength</Label>
                          <Input 
                            value={footballData.factors.favorite} 
                            onChange={(e) => setFootballData({...footballData, factors: {...footballData.factors, favorite: e.target.value}})}
                            className="bg-slate-950 border-white/10 text-white text-xs h-11"
                          />
                      </div>
                    </>
                 )}
              </div>
              
              <div className="pt-6 border-t border-white/5">
                 <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    Edite os valores acima para ajustes finos antes de exportar a imagem.
                 </p>
              </div>
           </div>

           {/* Preview Area - Refined */}
           <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between glass-dark px-6 py-4 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${activeBot === 'crypto' ? 'bg-sentinela-blue glow-blue' : 'bg-sentinela-emerald glow-emerald'}`} />
                    <span className="text-xs font-black text-white tracking-[0.2em] uppercase">Live Preview (1200x675)</span>
                 </div>
                 <ShadButton 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setIsZoomed(!isZoomed)}
                   className={`text-[10px] font-black h-9 px-4 gap-2 border border-white/10 transition-all ${isZoomed ? 'bg-sentinela-blue text-white glow-blue' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                   {isZoomed ? 'ADAPTAR TELA' : 'TAMANHO REAL'}
                 </ShadButton>
              </div>

              <div ref={containerRef} className={`w-full overflow-hidden pb-12 flex flex-col items-center ${isZoomed ? 'overflow-x-auto justify-start' : 'justify-center'}`}>
                 <div 
                   style={{ 
                     width: '1200px',
                     height: '675px',
                     transform: `scale(${scale})`,
                     transformOrigin: isZoomed ? 'top left' : 'top center',
                     marginBottom: `-${675 * (1 - scale)}px`,
                     transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                   }}
                   className="shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] rounded-[2.5rem] overflow-hidden"
                 >
                    <div 
                      ref={exportRef}
                      className={`relative w-[1200px] h-[675px] flex flex-col transition-all duration-500 antialiased ${activeBot === 'crypto' ? 'bg-slate-950 p-6 lg:p-12' : 'bg-slate-950'}`}
                      style={{ 
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale'
                      }}
                    >
                       {/* Background Cinematic effects */}
                       <div className={`absolute inset-0 transition-opacity duration-1000 ${activeBot === 'crypto' ? 'opacity-100' : 'opacity-0'}`} 
                            style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.15) 0%, transparent 60%)' }} />
                       <div className={`absolute inset-0 transition-opacity duration-1000 ${activeBot === 'football' ? 'opacity-100' : 'opacity-0'}`} 
                            style={{ backgroundImage: 'radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.15) 0%, transparent 60%)' }} />

                       {activeBot === 'crypto' ? (
                          <>
                             <div className="absolute top-8 left-8 flex items-center gap-3 z-50">
                                <div className="w-9 h-9 bg-sentinela-blue rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                                   <span className="text-sm font-black text-white">S</span>
                                </div>
                                <div>
                                   <h3 className="text-sm font-black text-white leading-none tracking-tighter text-glow">SENTINELA AI</h3>
                                   <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter italic">Elite Market Analysis Engine</p>
                                </div>
                             </div>
                             <div className="flex-1 mt-6 mb-2 glass rounded-3xl overflow-hidden border border-white/5 relative z-10">
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
                             <div className="mt-4 relative z-20">
                                <SentinelaBioPanel {...cryptoData} />
                             </div>
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
           </div>
        </div>
     </div>
  );
};
