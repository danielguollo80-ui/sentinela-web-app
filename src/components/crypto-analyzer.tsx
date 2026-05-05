"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const API_BASE = "/api/sync";

interface IndicatorData {
  ema_position?: string;
  ema21?: number;
  ema50?: number;
  ema200?: number;
  bb_position?: string;
  bb_width_label?: string;
  bb_width?: number;
  bb_upper?: number;
  bb_lower?: number;
  macd_cross?: string;
  macd_momentum?: string;
  macd_above_zero?: boolean;
  rsi?: number;
  adx?: number;
  adx_label?: string;
  plus_di?: number;
  minus_di?: number;
  atr?: number;
  atr_pct?: number;
  divergence?: string;
  trend?: string;
  wt1?: number;
  wt_dir?: string;
  vmc_dot?: string;
}

interface AnalysisResult {
  symbol: string;
  price: number;
  squeeze?: string;
  poc?: number;
  supports: number[];
  resistances: number[];
  fng: number;
  fng_label: string;
  news_pt?: string;
  indicators_1d: IndicatorData;
  indicators_4h: IndicatorData;
  ai_analysis: string;
  veredito?: "APROVADO" | "VETADO" | "AGUARDAR" | "ERRO";
  setup?: {
    tipo: string;
    score: number;
    entrada: number;
    stop: number;
    alvo1: number;
    alvo2: number;
    rr: number;
    fatores: string[];
  };
}


const fmtPrice = (val: number | undefined | null, decimals = 2) => {
  if (val == null) return "—";
  if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 4 });
};

function fmtNum(v?: number | null, d = 1) {
  if (v == null) return "—";
  return Number(v).toFixed(d);
}

function rsiColor(rsi?: number) {
  if (!rsi) return "text-slate-400";
  if (rsi >= 70) return "text-red-400";
  if (rsi <= 30) return "text-emerald-400";
  return "text-white";
}

function adxColor(label?: string) {
  if (!label) return "text-slate-400";
  if (label.includes("FORTE")) return "text-emerald-400";
  if (label.includes("FRACO")) return "text-yellow-500";
  return "text-slate-200";
}

function bbColor(pos?: string) {
  if (!pos) return "text-slate-400";
  if (pos.includes("SUPERIOR")) return "text-red-400";
  if (pos.includes("INFERIOR")) return "text-emerald-400";
  return "text-yellow-500";
}

function emaColor(pos?: string) {
  if (!pos) return "text-slate-400";
  if (pos.includes("BULLISH FORTE")) return "text-emerald-400";
  if (pos.includes("BULLISH")) return "text-emerald-300";
  if (pos.includes("BEARISH FORTE")) return "text-red-400";
  if (pos.includes("BEARISH")) return "text-red-300";
  return "text-white";
}

function macdColor(cross?: string) {
  if (!cross) return "text-slate-400";
  if (cross.includes("ALTA") || cross.includes("BULL")) return "text-emerald-400";
  if (cross.includes("BAIXA") || cross.includes("BEAR")) return "text-red-400";
  return "text-white";
}

function fngColor(v: number) {
  if (v >= 75) return "text-emerald-400";
  if (v >= 55) return "text-yellow-400";
  if (v <= 25) return "text-red-500";
  if (v <= 45) return "text-orange-400";
  return "text-slate-300";
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <SkeletonPulse className="h-24 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonPulse key={i} className="h-24" />)}
      </div>
    </div>
  );
}

function StatCell({ label, value, valueClass = "" }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-5 rounded-2xl bg-slate-900/60 border border-white/5">
      <span className="text-[15px] font-black uppercase tracking-widest text-white">{label}</span>
      <span className={`text-xl font-mono font-black ${valueClass || "text-white"}`}>{value}</span>
    </div>
  );
}

function AiAnalysisBlock({ text }: { text: string }) {
  const lines = text.trim().split("\n").filter(Boolean);
  return (
    <div className="space-y-3">
      {lines.map((line, i) => (
        <div key={i} className="text-sm font-medium leading-relaxed px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-200">
          {line}
        </div>
      ))}
    </div>
  );
}

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_CRYPTO_PASSWORD ?? "Sentinela2026";

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState("");
  const [wrong, setWrong] = useState(false);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pwd === CORRECT_PASSWORD) {
      sessionStorage.setItem("sentinel_auth", "1");
      onUnlock();
    } else {
      setWrong(true);
      setPwd("");
    }
  };
  return (
    <div className="container mx-auto px-4 max-w-sm mt-24">
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-6 text-center">
        <h2 className="text-2xl font-black text-white uppercase">SENTINELA <span className="text-emerald-400">PRO</span></h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="password" placeholder="Password" value={pwd} onChange={(e) => { setPwd(e.target.value); setWrong(false); }} className="bg-slate-950 border-slate-700 text-white text-center" />
          {wrong && <p className="text-sm text-red-400">Senha incorreta.</p>}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg h-12">Entrar</Button>
        </form>
      </div>
    </div>
  );
}

export function CryptoAnalyzer() {
  const [unlocked, setUnlocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsMounted(true);
      if (typeof window !== "undefined" && sessionStorage.getItem("sentinel_auth") === "1") setUnlocked(true);
    });
  }, []);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (sym: string) => {
    const s = sym.trim().toUpperCase().replace("USDT", "").replace("/", "");
    if (!s) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}?bot=crypto&symbol=${encodeURIComponent(s)}`);
      if (!res.ok) throw new Error("Erro na conexão");
      const data = await res.json();
      setResult(data.analysis);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  if (!isMounted) return null;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const d1 = result?.indicators_1d ?? (result as any)?.indicators_4h ?? (result as any)?.indicators_1h ?? {};
  const d4 = result?.indicators_4h ?? (result as any)?.indicators_1h ?? {};
  const displayPrice = result?.price ?? (result as any)?.indicators_1h?.price ?? (result as any)?.indicators_4h?.price ?? 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <form onSubmit={(e) => { e.preventDefault(); analyze(query); }} className="flex gap-3 mb-8">
        <Input placeholder="Ex: BTC, ETH..." value={query} onChange={(e) => setQuery(e.target.value)} className="bg-slate-950 border-white/10 text-white h-14 text-lg rounded-xl" />
        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 h-14 text-lg font-bold rounded-xl text-white">ANALISAR</Button>
      </form>

      {/* Quick Shortcuts */}
      <div className="space-y-4 mb-10">
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-widest ml-1">Day Trade Monitor</span>
          <div className="flex flex-wrap gap-2">
            {['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'AVAX'].map((coin) => (
              <button
                key={coin}
                onClick={() => analyze(coin)}
                className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 text-xs font-black text-slate-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-400 transition-all uppercase tracking-widest shadow-sm"
              >
                {coin}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-widest ml-1">Swing Trade Elite</span>
          <div className="flex flex-wrap gap-2">
            {['BTC', 'ETH', 'SOL', 'XRP'].map((coin) => (
              <button
                key={coin}
                onClick={() => analyze(coin)}
                className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 text-xs font-black text-slate-300 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400 transition-all uppercase tracking-widest shadow-sm"
              >
                {coin}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <LoadingSkeleton />}
      {error && !loading && (
        <div className="glass-dark rounded-2xl border border-rose-500/30 p-4 text-center">
          <p className="text-rose-400 text-sm font-bold">⚠️ {error}</p>
        </div>
      )}
      {result && !loading && (
        <div className="space-y-6">
          {/* Elite Horizontal Analysis Bar */}
          <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900/40">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/10">
              
              {/* SECTION 1: ASSET & PRICE */}
              <div className="lg:col-span-4 p-4 flex flex-col justify-center bg-slate-950/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[16px] font-black uppercase tracking-[0.2em] text-slate-200">{result.symbol} ANALYSIS</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sentinela-blue/20 text-sentinela-blue font-black border border-sentinela-blue/30">PRO</span>
                </div>
                <div className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-0.5">${fmtPrice(displayPrice, 2)}</div>
                {result.fng != null && (
                  <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${fngColor(result.fng)}`}>
                    FNG {result.fng} • {result.fng_label}
                  </div>
                )}
                {result.veredito && (
                  <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                    result.veredito === "APROVADO" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                    result.veredito === "VETADO" ? "bg-rose-500/20 border-rose-500/40 text-rose-400" :
                    "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      result.veredito === "APROVADO" ? "bg-emerald-400 animate-pulse" :
                      result.veredito === "VETADO" ? "bg-rose-400" : "bg-amber-400"
                    }`} />
                    IA AUDIT: {result.veredito}
                  </div>
                )}
              </div>

              {/* SECTION 2: TRADE SETUP (If exists) */}
              <div className="lg:col-span-5 p-4 grid grid-cols-2 gap-y-2 gap-x-6 items-center border-r border-white/10 bg-slate-950/20">
                {result.setup && result.setup.tipo !== 'NEUTRO' ? (
                  <>
                    <div className="col-span-2 flex items-center gap-2 mb-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${result.setup.tipo === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'} ${result.veredito === "APROVADO" ? "animate-ping" : ""}`} />
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${result.setup.tipo === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.setup.tipo === 'LONG' ? 'FUNDO (LONG)' : 'TOPO (SHORT)'} • {result.setup.score}/10
                        {result.veredito !== "APROVADO" && " • SOB AUDITORIA"}
                      </span>
                    </div>
                    {result.veredito === "APROVADO" ? (
                      <>
                        <div>
                          <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Entrada</div>
                          <div className="text-xl md:text-2xl font-mono font-black text-white">${fmtPrice(result.setup.entrada)}</div>
                        </div>
                        <div>
                          <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Target</div>
                          <div className="text-xl md:text-2xl font-mono font-black text-emerald-400">${fmtPrice(result.setup.alvo1)}</div>
                        </div>
                        <div>
                          <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Stop</div>
                          <div className="text-xl md:text-2xl font-mono font-black text-rose-400">${fmtPrice(result.setup.stop)}</div>
                        </div>
                        <div>
                          <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">R/R</div>
                          <div className="text-xl md:text-2xl font-black text-blue-400">{result.setup.rr.toFixed(1)}x</div>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 py-4">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sinal Aguardando Confirmação IA</div>
                        <div className="text-slate-600 text-xs italic font-medium">Os valores de entrada e stop foram ocultados para sua segurança até que a IA valide a confluência técnica.</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="col-span-2 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic py-4">
                    Aguardando setup de elite...
                  </div>
                )}
              </div>

              {/* SECTION 3: QUICK INDICATORS (RSI & WT) */}
              <div className="lg:col-span-3 p-4 flex flex-col justify-center gap-3 bg-slate-950/40">
                <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-1">
                  <span className="text-[12px] font-black text-white uppercase tracking-widest">RSI</span>
                  <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${rsiColor(result.indicators_1d.rsi)}`}>
                    {fmtNum(result.indicators_1d.rsi)}
                  </span>
                </div>
                <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-1">
                  <span className="text-[12px] font-black text-white uppercase tracking-widest">WT</span>
                  <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${
                    (result.indicators_4h.wt1 ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {fmtNum(result.indicators_4h.wt1)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <Tabs defaultValue="1d" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/80 p-1.5 h-14 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
              <TabsTrigger 
                value="1d" 
                className="rounded-xl font-black text-xs md:text-sm tracking-wider transition-all duration-200
                           text-white bg-slate-800/80
                           data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg"
              >
                ESTRATÉGICO (1D)
              </TabsTrigger>
              <TabsTrigger 
                value="4h" 
                className="rounded-xl font-black text-xs md:text-sm tracking-wider transition-all duration-200
                           text-white bg-slate-800/80
                           data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg"
              >
                TÁTICO (4H)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="1d" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCell label="Tendência EMA" value={d1.ema_position ?? "—"} valueClass={emaColor(d1.ema_position)} />
                <StatCell label="RSI" value={fmtNum(d1.rsi)} valueClass={rsiColor(d1.rsi)} />
                <StatCell label="ADX" value={fmtNum(d1.adx)} valueClass={adxColor(d1.adx_label)} />
                <StatCell label="DI+" value={fmtNum(d1.plus_di)} valueClass="text-emerald-400" />
                <StatCell label="DI-" value={fmtNum(d1.minus_di)} valueClass="text-rose-400" />
                <StatCell label="Bollinger" value={d1.bb_position ?? "—"} valueClass={bbColor(d1.bb_position)} />
                <StatCell label="MACD" value={d1.macd_cross ?? "—"} valueClass={macdColor(d1.macd_cross)} />
                <StatCell label="POC Pivot" value={`$${fmtPrice(result.poc, 2)}`} valueClass="text-blue-400" />
                <StatCell label="ATR" value={`$${fmtPrice(d1.atr, 2)}`} />
              </div>
            </TabsContent>
            <TabsContent value="4h" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCell label="RSI 4H" value={fmtNum(d4.rsi)} valueClass={rsiColor(d4.rsi)} />
                <StatCell label="VMC" value={d4.vmc_dot ?? "—"} valueClass={d4.vmc_dot === "GREEN" ? "text-emerald-400" : d4.vmc_dot === "RED" ? "text-rose-400" : "text-amber-400"} />
                <StatCell label="WT1" value={d4.wt1?.toFixed(2)} valueClass={(d4.wt1 ?? 0) > 0 ? "text-emerald-400" : "text-rose-400"} />
                <StatCell label="MFI" value={fmtNum(d4.mfi)} valueClass={d4.mfi >= 80 ? "text-rose-400" : d4.mfi <= 20 ? "text-emerald-400" : "text-white"} />
                <StatCell label="Divergência" value={d4.divergence ?? "NEUTRO"} valueClass={d4.divergence?.includes("BULLISH") ? "text-emerald-400" : d4.divergence?.includes("BEARISH") ? "text-rose-400" : "text-slate-400"} />
                <StatCell label="Volatilidade" value={d4.bb_width_label ?? "—"} valueClass={d4.bb_width_label === "SQUEEZE" ? "text-amber-400 animate-pulse" : "text-blue-400"} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* S/R Levels */}
            <div className="glass-dark rounded-2xl border border-white/10 p-5 shadow-lg bg-slate-900/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-emerald" />
                Critical Support Levels
              </h3>
              <div className="space-y-3">
                {(result.supports ?? []).slice(0, 3).map((s: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-10 bg-emerald-500/40 rounded-full" />
                      <span className="text-xs md:text-sm font-black text-emerald-400 uppercase tracking-widest">Support {i + 1}</span>
                    </div>
                    <span className="text-base md:text-xl font-black text-white font-mono tracking-tighter">${fmtPrice(s)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-dark rounded-2xl border border-white/10 p-5 shadow-lg bg-slate-900/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 glow-rose" />
                Critical Resistance Levels
              </h3>
              <div className="space-y-3">
                {(result.resistances ?? []).slice(0, 3).map((r: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-10 bg-rose-500/40 rounded-full" />
                      <span className="text-xs md:text-sm font-black text-rose-400 uppercase tracking-widest">Resistance {i + 1}</span>
                    </div>
                    <span className="text-base md:text-xl font-black text-white font-mono tracking-tighter">${fmtPrice(r)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="glass-dark rounded-2xl border border-sentinela-blue/20 p-4 shadow-lg relative overflow-hidden">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-sentinela-blue glow-blue animate-pulse" />
               AI QUANTITATIVE ANALYSIS — CLAUDE
            </h3>
            <div className="relative z-10">
               {result.ai_analysis ? (
                 <AiAnalysisBlock text={result.ai_analysis} />
               ) : (
                 <p className="text-xs text-slate-500 italic">Análise quantitativa indisponível no momento.</p>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
