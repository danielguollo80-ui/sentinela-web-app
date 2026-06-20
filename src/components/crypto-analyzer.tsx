"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateRSI, calculateMACD, calculateATR, calculateADX,
  calculateBB, calculateEMA, calculateMFI, detectDivergence,
} from "@/lib/indicators";
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
  mfi?: number;
  volume_ratio?: number;
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
  indicators_1h?: IndicatorData;
  indicators_15m?: IndicatorData;
  indicators_5m?: IndicatorData;
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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const activeSymbol = useRef<string>("");

  // Calcula RSI diretamente dos closes (sem dependências externas)
  function calcRsi(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    let ag = gains / period, al = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      ag = (ag * (period - 1) + Math.max(d, 0)) / period;
      al = (al * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (al === 0) return 100;
    return Math.round((100 - 100 / (1 + ag / al)) * 10) / 10;
  }

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [livePriceTs, setLivePriceTs] = useState<Date | null>(null);
  const livePriceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calcula todos os indicadores de um conjunto de candles
  function calcIndicators(candles: any[][]): IndicatorData & { price?: number } {
    if (!candles || candles.length < 30) return {};
    const highs   = candles.map((c: any[]) => parseFloat(c[2]));
    const lows    = candles.map((c: any[]) => parseFloat(c[3]));
    const closes  = candles.map((c: any[]) => parseFloat(c[4]));
    const volumes = candles.map((c: any[]) => parseFloat(c[5]));
    const price   = closes[closes.length - 1];

    const rsi    = Math.round(calculateRSI(closes, 14) * 10) / 10;
    const macd   = calculateMACD(closes);
    const bb     = calculateBB(closes);
    const adxRes = calculateADX(highs, lows, closes, 14);
    const atrArr = calculateATR(highs, lows, closes, 14);
    const atr    = atrArr[atrArr.length - 1] ?? 0;
    const ema21  = (calculateEMA(closes, 21) as number[]).at(-1) ?? 0;
    const ema50  = (calculateEMA(closes, 50) as number[]).at(-1) ?? 0;
    const ema200 = (calculateEMA(closes, 200) as number[]).at(-1) ?? 0;
    const mfi    = calculateMFI(highs, lows, closes, volumes, 14);

    // RSI series p/ divergência
    const rsiSeries: number[] = [];
    for (let i = 20; i <= closes.length; i++) rsiSeries.push(calculateRSI(closes.slice(0, i), 14));
    const divergence = detectDivergence(closes, rsiSeries);

    // EMA position
    let ema_position = "NEUTRO";
    if (price > ema21 && ema21 > ema50 && ema50 > ema200) ema_position = "BULLISH FORTE (P>21>50>200)";
    else if (price > ema200) ema_position = "BULLISH PARCIAL (acima EMA200)";
    else if (price < ema21 && ema21 < ema50 && ema50 < ema200) ema_position = "BEARISH FORTE (P<21<50<200)";
    else if (price < ema200) ema_position = "BEARISH PARCIAL (abaixo EMA200)";

    // BB width label
    const bb_width_label = bb.width < 0.04 ? "SQUEEZE" : bb.width < 0.08 ? "NORMAL" : "EXPANSÃO";

    // Volume ratio (média 20)
    const avg20vol = volumes.length >= 20 ? volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20 : 0;
    const volume_ratio = avg20vol > 0 ? Math.round((volumes.at(-1)! / avg20vol) * 100) / 100 : 0;

    // ADX label
    const adx_label = adxRes.adx >= 35 ? "FORTE" : adxRes.adx >= 20 ? "MODERADO" : "FRACO";

    // WaveTrend (WT) simplificado via CCI proxy
    const hlc3 = closes.map((c: number, i: number) => (highs[i] + lows[i] + c) / 3);
    const ema10 = calculateEMA(hlc3, 10) as number[];
    const meanDev = hlc3.slice(-10).reduce((a: number, b: number, _: number, arr: number[]) => {
      const m = arr.reduce((x: number, y: number) => x + y, 0) / arr.length;
      return a + Math.abs(b - m);
    }, 0) / 10;
    const ci = meanDev > 0 ? (hlc3[hlc3.length - 1] - ema10[ema10.length - 1]) / (0.015 * meanDev) : 0;
    const wt1 = Math.round(ci * 10) / 10;
    const vmc_dot = wt1 > 0 ? "GREEN" : "RED";

    // Tendência macro (para RSI no topo da UI)
    const trend = price > ema200 ? "BULLISH" : "BEARISH";

    return {
      price,
      rsi,
      macd_cross: macd.cross,
      macd_momentum: macd.aboveZero ? "ACIMA ZERO" : "ABAIXO ZERO",
      macd_above_zero: macd.aboveZero,
      adx: Math.round(adxRes.adx * 10) / 10,
      adx_label,
      plus_di:  Math.round(adxRes.plusDI  * 10) / 10,
      minus_di: Math.round(adxRes.minusDI * 10) / 10,
      bb_position:   bb.position,
      bb_width:      Math.round(bb.width * 1000) / 1000,
      bb_width_label,
      bb_upper: bb.upper,
      bb_lower: bb.lower,
      atr:     Math.round(atr * 100) / 100,
      atr_pct: price > 0 ? Math.round((atr / price) * 10000) / 100 : 0,
      ema21, ema50, ema200,
      ema_position,
      volume_ratio,
      mfi:       Math.round(mfi * 10) / 10,
      divergence,
      wt1,
      vmc_dot,
      trend,
    };
  }

  // Busca candles da Binance Futures para todos os TFs e calcula indicadores ao vivo
  async function fetchBinanceLive(symbol: string): Promise<Partial<{
    price: number; poc: number;
    indicators_1d: IndicatorData; indicators_4h: IndicatorData;
    indicators_1h: IndicatorData; indicators_15m: IndicatorData; indicators_5m: IndicatorData;
  }>> {
    const pair = `${symbol}USDT`;
    const base = "https://fapi.binance.com/fapi/v1";
    try {
      const [k1d, k4h, k1h, k15m, k5m] = await Promise.all([
        fetch(`${base}/klines?symbol=${pair}&interval=1d&limit=300`).then(r => r.json()),
        fetch(`${base}/klines?symbol=${pair}&interval=4h&limit=300`).then(r => r.json()),
        fetch(`${base}/klines?symbol=${pair}&interval=1h&limit=500`).then(r => r.json()),
        fetch(`${base}/klines?symbol=${pair}&interval=15m&limit=300`).then(r => r.json()),
        fetch(`${base}/klines?symbol=${pair}&interval=5m&limit=200`).then(r => r.json()),
      ]);
      const ind1d  = calcIndicators(k1d);
      const ind4h  = calcIndicators(k4h);
      const ind1h  = calcIndicators(k1h);
      const ind15m = calcIndicators(k15m);
      const ind5m  = calcIndicators(k5m);

      // POC via Bollinger mid do 4H
      const closes4h = Array.isArray(k4h) ? k4h.map((c: any[]) => parseFloat(c[4])) : [];
      const mean4h   = closes4h.length >= 20 ? closes4h.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20 : 0;

      const price = ind1h.price ?? ind4h.price ?? 0;

      return {
        price,
        poc: Math.round(mean4h * 100) / 100,
        indicators_1d:  ind1d,
        indicators_4h:  ind4h,
        indicators_1h:  ind1h,
        indicators_15m: ind15m,
        indicators_5m:  ind5m,
      };
    } catch { return {}; }
  }

  // Atualiza só o preço ao vivo via Binance ticker (levíssimo, sem recalcular indicadores)
  const refreshLivePrice = useCallback(async (symbol: string) => {
    if (!symbol) return;
    try {
      const pair = `${symbol}USDT`;
      const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${pair}`);
      if (!res.ok) return;
      const data = await res.json();
      const p = parseFloat(data?.price ?? "0");
      if (p > 0) { setLivePrice(p); setLivePriceTs(new Date()); }
    } catch { /* silencioso */ }
  }, []);

  // Inicia/reinicia o timer de preço ao vivo quando muda de moeda
  useEffect(() => {
    if (livePriceTimer.current) clearInterval(livePriceTimer.current);
    setLivePrice(null);
    setLivePriceTs(null);
    if (!activeSymbol.current) return;
    refreshLivePrice(activeSymbol.current);
    livePriceTimer.current = setInterval(() => refreshLivePrice(activeSymbol.current), 30_000);
    return () => { if (livePriceTimer.current) clearInterval(livePriceTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.symbol, refreshLivePrice]);

  const analyze = useCallback(async (sym: string, silent = false) => {
    const s = sym.trim().toUpperCase().replace("USDT", "").replace("/", "");
    if (!s) return;
    activeSymbol.current = s;
    if (!silent) { setLoading(true); setError(null); setResult(null); }
    try {
      // Usa sempre o caminho de cache + enriquecimento Binance (Path B): estável no Vercel e traz o 5M.
      // O live=1 (multi-exchange via Bybit) falha no Vercel e às vezes retorna 404; para moeda fora do
      // cache o backend já cai no fallback multi-exchange sozinho (quando symbolData não existe).
      const url = `${API_BASE}?bot=crypto&symbol=${encodeURIComponent(s)}&noai=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro na conexão");
      const data = await res.json();
      let analysis = data.analysis;

      // Todos os TFs calculados ao vivo da Binance — cache do bot só serve de fallback
      const live = await fetchBinanceLive(s);
      analysis = {
        ...analysis,
        price:          (live.price  && live.price  > 0) ? live.price  : (analysis?.price  || 0),
        poc:            (live.poc    && live.poc    > 0) ? live.poc    : (analysis?.poc    || 0),
        indicators_1d:  { ...(analysis?.indicators_1d  ?? {}), ...live.indicators_1d  },
        indicators_4h:  { ...(analysis?.indicators_4h  ?? {}), ...live.indicators_4h  },
        indicators_1h:  { ...(analysis?.indicators_1h  ?? {}), ...live.indicators_1h  },
        indicators_15m: { ...(analysis?.indicators_15m ?? {}), ...live.indicators_15m },
        indicators_5m:  { ...(analysis?.indicators_5m  ?? {}), ...live.indicators_5m  },
      };

      setResult(prev => silent
        ? { ...(prev ?? analysis), ...analysis, ai_analysis: prev?.ai_analysis ?? analysis.ai_analysis }
        : analysis
      );
      setLastRefresh(new Date());
    } catch (e: any) { if (!silent) setError(e.message); } finally { if (!silent) setLoading(false); }
  }, []);

  // Auto-refresh desativado — dados são buscados ao vivo apenas quando o usuário clica/pesquisa

  if (!isMounted) return null;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const d1  = result?.indicators_1d ?? (result as any)?.indicators_4h ?? (result as any)?.indicators_1h ?? {};
  const d4  = result?.indicators_4h ?? (result as any)?.indicators_1h ?? {};
  const d1h = result?.indicators_1h ?? {};
  const d15 = result?.indicators_15m ?? {};
  const d5  = result?.indicators_5m ?? {};
  const cachedPrice = result?.price ?? (result as any)?.indicators_1h?.price ?? (result as any)?.indicators_4h?.price ?? 0;
  const displayPrice = (livePrice && livePrice > 0) ? livePrice : cachedPrice;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <form onSubmit={(e) => { e.preventDefault(); analyze(query); }} className="flex gap-3 mb-2">
        <Input placeholder="Ex: BTC, ETH..." value={query} onChange={(e) => setQuery(e.target.value)} className="bg-slate-950 border-white/10 text-white h-14 text-lg rounded-xl" />
        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 h-14 text-lg font-bold rounded-xl text-white">ANALISAR</Button>
      </form>
      {lastRefresh && (
        <p className="text-[11px] text-slate-500 text-right mb-6">
          ↻ indicadores {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          {livePriceTs && (
            <span className="text-emerald-600 ml-2">
              · preço ao vivo {livePriceTs.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </p>
      )}

      {/* Quick Shortcuts */}
      <div className="space-y-4 mb-10">
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-widest ml-1">Day Trade Monitor</span>
          <div className="flex flex-wrap gap-2">
            {['BTC', 'ETH', 'SOL', 'XRP', 'LINK', 'DOGE', 'AVAX'].map((coin) => (
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
                <div className="flex items-baseline gap-2 mb-0.5">
                  <div className="text-2xl md:text-4xl font-black text-white tracking-tighter">${fmtPrice(displayPrice, 2)}</div>
                  {livePrice && livePrice > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      AO VIVO
                    </span>
                  )}
                </div>
                {result.fng != null && (
                  <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${fngColor(result.fng)}`}>
                    FNG {result.fng} • {result.fng_label}
                  </div>
                )}
                {result.veredito && result.setup && result.setup.tipo !== 'NEUTRO' && (
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
                      <div className={`w-1.5 h-1.5 rounded-full ${(result.setup.tipo === 'LONG' || result.setup.tipo === 'POSSIBLE_BOTTOM') ? 'bg-emerald-400' : 'bg-rose-400'} ${result.veredito === "APROVADO" ? "animate-ping" : ""}`} />
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${(result.setup.tipo === 'LONG' || result.setup.tipo === 'POSSIBLE_BOTTOM') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(result.setup.tipo === 'LONG' || result.setup.tipo === 'POSSIBLE_BOTTOM') ? 'FUNDO (LONG)' : 'TOPO (SHORT)'} • {result.setup.score}/10
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
                  <span className="text-[12px] font-black text-white uppercase tracking-widest">RSI <span className="text-slate-500 font-medium normal-case">1D</span></span>
                  <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${rsiColor(result.indicators_1d?.rsi)}`}>
                    {fmtNum(result.indicators_1d?.rsi)}
                  </span>
                </div>
                <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-1">
                  <span className="text-[12px] font-black text-white uppercase tracking-widest">WT <span className="text-slate-500 font-medium normal-case">1D</span></span>
                  <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${
                    (result.indicators_1d?.wt1 ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {fmtNum(result.indicators_1d?.wt1)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <Tabs defaultValue="1d" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900/80 p-1.5 h-14 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
              <TabsTrigger
                value="1d"
                className="rounded-xl font-black text-[10px] md:text-xs tracking-wider transition-all duration-200
                           text-white bg-slate-800/80
                           data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg"
              >
                ESTRATÉGICO (1D)
              </TabsTrigger>
              <TabsTrigger
                value="4h"
                className="rounded-xl font-black text-[10px] md:text-xs tracking-wider transition-all duration-200
                           text-white bg-slate-800/80
                           data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg"
              >
                TÁTICO (4H)
              </TabsTrigger>
              <TabsTrigger
                value="scalp"
                className="rounded-xl font-black text-[10px] md:text-xs tracking-wider transition-all duration-200
                           text-white bg-slate-800/80
                           data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg"
              >
                SCALP (1H/15M/5M)
              </TabsTrigger>
            </TabsList>
            <TabsContent value="1d" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCell label="Tendência 1D" value={d1.ema_position ?? "—"} valueClass={emaColor(d1.ema_position)} />
                <StatCell label="Tendência 4H" value={d4.ema_position ?? "—"} valueClass={emaColor(d4.ema_position)} />
                <StatCell label="RSI" value={fmtNum(d1.rsi)} valueClass={rsiColor(d1.rsi)} />
                <StatCell label="ADX" value={fmtNum(d1.adx)} valueClass={adxColor(d1.adx_label)} />
                <StatCell label="DI+" value={fmtNum(d1.plus_di)} valueClass="text-emerald-400" />
                <StatCell label="DI-" value={fmtNum(d1.minus_di)} valueClass="text-rose-400" />
                <StatCell label="MACD" value={d1.macd_cross ?? "—"} valueClass={macdColor(d1.macd_cross)} />
                <StatCell label="POC Pivot" value={`$${fmtPrice(result.poc, 2)}`} valueClass="text-blue-400" />
                <StatCell label="ATR" value={`$${fmtPrice(d1.atr, 2)}`} />
                <StatCell
                  label="Volume 1D"
                  value={d1.volume_ratio != null ? `${d1.volume_ratio.toFixed(2)}x` : "—"}
                  valueClass={(d1.volume_ratio ?? 0) >= 2 ? "text-emerald-400" : (d1.volume_ratio ?? 0) >= 1.2 ? "text-yellow-400" : "text-slate-400"}
                />
              </div>
            </TabsContent>
            <TabsContent value="4h" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCell label="RSI 4H" value={fmtNum(d4.rsi)} valueClass={rsiColor(d4.rsi)} />
                <StatCell label="MACD 4H" value={d4.macd_cross ?? "—"} valueClass={macdColor(d4.macd_cross)} />
                <StatCell label="ADX 4H" value={fmtNum(d4.adx)} valueClass={adxColor(d4.adx_label)} />
                <StatCell label="DI+ 4H" value={fmtNum(d4.plus_di)} valueClass="text-emerald-400" />
                <StatCell label="DI- 4H" value={fmtNum(d4.minus_di)} valueClass="text-rose-400" />
                <StatCell label="POC Pivot" value={`$${fmtPrice(result.poc, 2)}`} valueClass="text-blue-400" />
                {d4.divergence && d4.divergence !== "NEUTRO" && (
                  <StatCell label="Divergência" value={d4.divergence} valueClass={d4.divergence.includes("BULLISH") ? "text-emerald-400" : "text-rose-400"} />
                )}
                <StatCell
                  label="Volume 4H"
                  value={d4.volume_ratio != null ? `${d4.volume_ratio.toFixed(2)}x` : "—"}
                  valueClass={(d4.volume_ratio ?? 0) >= 2 ? "text-emerald-400" : (d4.volume_ratio ?? 0) >= 1.2 ? "text-yellow-400" : "text-slate-400"}
                />
              </div>
            </TabsContent>
            <TabsContent value="scalp" className="mt-6 space-y-5">
              {/* 1H Row */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Timeframe 1H</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCell label="RSI 1H" value={fmtNum(d1h.rsi)} valueClass={rsiColor(d1h.rsi)} />
                  <StatCell label="MACD 1H" value={d1h.macd_cross ?? "—"} valueClass={macdColor(d1h.macd_cross)} />
                  <StatCell label="ADX 1H" value={fmtNum(d1h.adx)} valueClass={adxColor(d1h.adx_label)} />
                  <StatCell label="DI+ 1H" value={fmtNum(d1h.plus_di)} valueClass="text-emerald-400" />
                  <StatCell label="DI- 1H" value={fmtNum(d1h.minus_di)} valueClass="text-rose-400" />
                  <StatCell label="Tendência EMA" value={d1h.ema_position ?? "—"} valueClass={emaColor(d1h.ema_position)} />
                  <StatCell
                    label="Volume 1H"
                    value={d1h.volume_ratio != null ? `${d1h.volume_ratio.toFixed(2)}x` : "—"}
                    valueClass={(d1h.volume_ratio ?? 0) >= 2 ? "text-emerald-400" : (d1h.volume_ratio ?? 0) >= 1.2 ? "text-yellow-400" : "text-slate-400"}
                  />
                  <StatCell label="WT 1H" value={fmtNum(d1h.wt1)} valueClass={(d1h.wt1 ?? 0) >= 60 ? "text-rose-400" : (d1h.wt1 ?? 0) <= -60 ? "text-emerald-400" : (d1h.wt1 ?? 0) > 0 ? "text-emerald-300" : "text-rose-300"} />
                </div>
              </div>
              {/* 15M Row */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Timeframe 15M</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCell label="RSI 15M" value={fmtNum(d15.rsi)} valueClass={rsiColor(d15.rsi)} />
                  <StatCell label="MACD 15M" value={d15.macd_cross ?? "—"} valueClass={macdColor(d15.macd_cross)} />
                  <StatCell label="ADX 15M" value={fmtNum(d15.adx)} valueClass={adxColor(d15.adx_label)} />
                  <StatCell label="DI+ 15M" value={fmtNum(d15.plus_di)} valueClass="text-emerald-400" />
                  <StatCell label="DI- 15M" value={fmtNum(d15.minus_di)} valueClass="text-rose-400" />
                  <StatCell label="Tendência EMA" value={d15.ema_position ?? "—"} valueClass={emaColor(d15.ema_position)} />
                </div>
              </div>
              {/* 5M Row */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Timeframe 5M</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCell label="RSI 5M" value={fmtNum(d5.rsi)} valueClass={rsiColor(d5.rsi)} />
                  <StatCell label="MACD 5M" value={d5.macd_cross ?? "—"} valueClass={macdColor(d5.macd_cross)} />
                  <StatCell label="ADX 5M" value={fmtNum(d5.adx)} valueClass={adxColor(d5.adx_label)} />
                  <StatCell label="DI+ 5M" value={fmtNum(d5.plus_di)} valueClass="text-emerald-400" />
                  <StatCell label="DI- 5M" value={fmtNum(d5.minus_di)} valueClass="text-rose-400" />
                </div>
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
                {(result.supports ?? []).filter(s => s < displayPrice).slice(0, 3).map((s: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-10 bg-emerald-500/40 rounded-full" />
                      <span className="text-xs md:text-sm font-black text-emerald-400 uppercase tracking-widest">Support {i + 1}</span>
                    </div>
                    <span className="text-base md:text-xl font-black text-white font-mono tracking-tighter">${fmtPrice(s)}</span>
                  </div>
                ))}
                {(result.supports ?? []).filter(s => s < displayPrice).length === 0 && (
                  <p className="text-xs text-slate-500 italic text-center py-2">Sem suportes abaixo do preço atual</p>
                )}
              </div>
            </div>

            <div className="glass-dark rounded-2xl border border-white/10 p-5 shadow-lg bg-slate-900/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 glow-rose" />
                Critical Resistance Levels
              </h3>
              <div className="space-y-3">
                {(result.resistances ?? []).filter(r => r > displayPrice).slice(0, 3).map((r: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-10 bg-rose-500/40 rounded-full" />
                      <span className="text-xs md:text-sm font-black text-rose-400 uppercase tracking-widest">Resistance {i + 1}</span>
                    </div>
                    <span className="text-base md:text-xl font-black text-white font-mono tracking-tighter">${fmtPrice(r)}</span>
                  </div>
                ))}
                {(result.resistances ?? []).filter(r => r > displayPrice).length === 0 && (
                  <p className="text-xs text-slate-500 italic text-center py-2">Sem resistências acima do preço atual</p>
                )}
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
