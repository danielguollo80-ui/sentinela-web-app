"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart2,
  Zap,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const API_BASE = "/api/sync";

const QUICK_PICKS = ["BTC", "ETH", "SOL", "AVAX", "TAO", "SUI", "XRP"];

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

function TradeSetupBlock({ setup }: { setup: NonNullable<AnalysisResult['setup']> }) {
  if (setup.tipo === 'NEUTRO') return null;
  const isLong = setup.tipo === 'LONG';
  const colorClass = isLong ? 'sentinela-emerald' : 'rose-500';
  const borderClass = isLong ? 'border-sentinela-emerald/30' : 'border-rose-500/30';
  const bgClass = isLong ? 'bg-sentinela-emerald/10' : 'bg-rose-500/10';
  const glowClass = isLong ? 'glow-emerald' : 'glow-rose';

  return (
    <Card className={`overflow-hidden border border-white/5 ${bgClass} glass-dark rounded-2xl`}>
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full bg-${colorClass} ${glowClass}`} />
            <CardTitle className={`text-sm font-black text-${colorClass} uppercase tracking-widest`}>
              POSSÍVEL {isLong ? 'FUNDO — PODE COMPRAR' : 'TOPO — PODE VENDER'}
            </CardTitle>
          </div>
          <Badge className={`bg-${colorClass}/20 text-${colorClass} border-${colorClass}/30 font-black px-3 py-1`}>
            {setup.score}/10
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Confluences */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confluências Detectadas:</p>
          <div className="flex flex-wrap gap-1.5">
            {setup.fatores.map((f, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                • {f}
              </span>
            ))}
          </div>
        </div>

        {/* Levels */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Entrada</p>
            <p className="text-sm font-black text-white font-mono">${setup.entrada.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Stop Loss</p>
            <p className="text-sm font-black text-rose-400 font-mono">${setup.stop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Alvo 1 (T1)</p>
            <p className="text-sm font-black text-emerald-400 font-mono">${setup.alvo1.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 rounded-xl bg-sentinela-blue/10 border border-sentinela-blue/20">
            <p className="text-[9px] font-black text-sentinela-blue uppercase mb-1">Risk/Reward</p>
            <p className="text-sm font-black text-sentinela-blue font-mono">{setup.rr.toFixed(1)}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function fmtPrice(v?: number | null, decimals = 2) {
  if (v == null) return "—";
  if (v >= 1000) {
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (v >= 1) {
    return v.toFixed(decimals);
  }
  // Para moedas muito baratas (PEPE, SHIB, etc) usamos até 10 casas decimais
  return v.toFixed(10).replace(/\.?0+$/, "");
}

function fmtNum(v?: number | null, d = 1) {
  if (v == null) return "—";
  return Number(v).toFixed(d);
}

function rsiColor(rsi?: number) {
  if (!rsi) return "text-slate-400";
  if (rsi >= 70) return "text-red-400";
  if (rsi <= 30) return "text-emerald-400";
  return "text-slate-200";
}

function adxColor(label?: string) {
  if (!label) return "text-slate-400";
  if (label.includes("FORTE")) return "text-emerald-400";
  if (label.includes("FRACO")) return "text-yellow-400";
  return "text-slate-400";
}

function bbColor(pos?: string) {
  if (!pos) return "text-slate-400";
  if (pos.includes("SUPERIOR")) return "text-red-400";
  if (pos.includes("INFERIOR")) return "text-emerald-400";
  return "text-yellow-400";
}

function emaColor(pos?: string) {
  if (!pos) return "text-slate-400";
  if (pos.includes("BULLISH FORTE")) return "text-emerald-400";
  if (pos.includes("BULLISH")) return "text-emerald-300";
  if (pos.includes("BEARISH FORTE")) return "text-red-400";
  if (pos.includes("BEARISH")) return "text-red-300";
  return "text-slate-400";
}

function macdColor(cross?: string) {
  if (!cross) return "text-slate-400";
  if (cross.includes("ALTA") || cross.includes("BULL")) return "text-emerald-400";
  if (cross.includes("BAIXA") || cross.includes("BEAR")) return "text-red-400";
  return "text-slate-400";
}

function fngColor(v: number) {
  if (v >= 75) return "text-emerald-400";
  if (v >= 55) return "text-yellow-400";
  if (v <= 25) return "text-red-500";
  if (v <= 45) return "text-orange-400";
  return "text-slate-300";
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <SkeletonPulse className="h-16 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-20" />
        ))}
      </div>
      <SkeletonPulse className="h-32 w-full" />
      <SkeletonPulse className="h-40 w-full" />
    </div>
  );
}

function StatCell({ label, value, valueClass = "" }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-sm font-mono font-bold ${valueClass || "text-slate-200"}`}>{value}</span>
    </div>
  );
}

function AiAnalysisBlock({ text }: { text: string }) {
  const lines = text.trim().split("\n").filter(Boolean);
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isLong = line.includes("Long:");
        const isShort = line.includes("Short:");
        const isWarn = line.includes("⚠️");
        const isNote = line.startsWith("📝");
        return (
          <div
            key={i}
            className={`text-sm font-mono leading-relaxed px-3 py-2 rounded-md ${
              isLong
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : isShort
                ? "bg-red-500/10 border border-red-500/20 text-red-300"
                : isWarn
                ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300"
                : isNote
                ? "bg-slate-800/40 text-slate-400"
                : "bg-slate-800/60 text-slate-200 font-bold"
            }`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_CRYPTO_PASSWORD ?? "Sentinela2026";

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd] = useState("");
  const [wrong, setWrong] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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
        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)] border border-emerald-500/20 mx-auto">
          <img src="/logo-premium.png" alt="Sentinela Logo" className="w-full h-full object-cover scale-110" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">SENTINELA <span className="text-emerald-400">PRO</span></h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Acesso Restrito — Elite Market Analysis</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setWrong(false); }}
            className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-600 text-center focus-visible:ring-emerald-500/50"
            autoFocus
          />
          {wrong && <p className="text-xs text-red-400">Password incorreta.</p>}
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}

export function CryptoAnalyzer() {
  const [unlocked, setUnlocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Usamos um microtask para evitar o erro de setState síncrono no React 19
    queueMicrotask(() => {
      setIsMounted(true);
      if (typeof window !== "undefined" && sessionStorage.getItem("sentinel_auth") === "1") {
        setUnlocked(true);
      }
    });
  }, []);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (sym: string) => {
    const s = sym.trim().toUpperCase().replace("USDT", "").replace("/", "");
    if (!s) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}?bot=crypto&symbol=${encodeURIComponent(s)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data.analysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyze(query);
  };

  const d1 = result?.indicators_1d ?? {};
  const d4 = result?.indicators_4h ?? {};

  const macdAboveIcon = d1.macd_above_zero ? (
    <span className="text-emerald-400">🟢</span>
  ) : (
    <span className="text-red-400">🔴</span>
  );

  const pocLabel = (() => {
    if (!result?.poc || !result?.price) return null;
    return result.price > result.poc ? (
      <span className="text-emerald-400">ACIMA</span>
    ) : (
      <span className="text-red-400">ABAIXO</span>
    );
  })();

  if (!isMounted) return null;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 max-w-4xl">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <Input
            placeholder="Qualquer par: BTC, ETH, PEPE, SUI/USDT…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-slate-950 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-sentinela-blue/50 h-10 rounded-xl text-sm"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-10 px-6 bg-sentinela-blue hover:bg-sentinela-blue/80 text-white font-black rounded-xl shadow-lg glow-blue disabled:opacity-40 transition-all active:scale-95 text-xs"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "ANALISAR"}
        </Button>
      </form>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
        {QUICK_PICKS.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); analyze(s); }}
            disabled={loading}
            className="px-3 py-1 text-[9px] font-black rounded-full border border-white/5 bg-white/5 text-slate-400 hover:border-sentinela-blue/50 hover:text-white hover:bg-sentinela-blue/10 transition-all disabled:opacity-40 uppercase tracking-widest"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {error && !loading && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 glow-blue">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-mono font-bold uppercase tracking-tight">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-4 space-y-4">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-dark rounded-2xl border border-white/10 glow-blue">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sentinela-blue flex items-center justify-center shadow-lg glow-blue">
                <span className="text-lg font-black text-white">{result.symbol.split("/")[0].slice(0, 2)}</span>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Asset</div>
                <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
                  {result.symbol}
                  {result.squeeze && result.squeeze !== "Normal" && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-black text-[9px] py-0.5 px-1.5">
                      <Zap className="w-2.5 h-2.5 mr-1" /> {result.squeeze.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-black text-sentinela-blue text-glow leading-none">${fmtPrice(result.price)}</div>
              <div className={`text-[10px] font-black tracking-widest mt-1 ${fngColor(result.fng)}`}>
                FNG {result.fng} • {(result.fng_label ?? "Neutral").toUpperCase()}
              </div>
            </div>
          </div>

          {/* Tabs: 1D / 4H */}
          <Tabs defaultValue="1d" className="w-full">
            <TabsList className="bg-slate-950/60 border border-white/5 p-1 h-10 rounded-xl w-full">
              <TabsTrigger value="1d" className="flex-1 rounded-lg font-black text-[10px] data-[state=active]:bg-sentinela-blue data-[state=active]:text-white transition-all h-full">
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> DIÁRIO (1D)
              </TabsTrigger>
              <TabsTrigger value="4h" className="flex-1 rounded-lg font-black text-[10px] data-[state=active]:bg-sentinela-blue data-[state=active]:text-white transition-all h-full">
                <Activity className="w-3.5 h-3.5 mr-1.5" /> TÁTICO (4H)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="1d" className="mt-3 space-y-3">
              {/* EMAs */}
              <div className="glass-dark rounded-2xl border border-white/5 p-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sentinela-blue/30 to-transparent" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-2">
                   <TrendingUp className="w-3 h-3" /> Exponential Moving Averages
                </h3>
                <div className={`text-base font-black mb-3 tracking-tight ${emaColor(d1.ema_position)} text-glow`}>
                  {d1.ema_position ?? "—"}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="EMA 21" value={`$${fmtPrice(d1.ema21)}`} valueClass="text-sentinela-blue" />
                  <StatCell label="EMA 50" value={`$${fmtPrice(d1.ema50)}`} />
                  <StatCell label="EMA 200" value={`$${fmtPrice(d1.ema200)}`} />
                </div>
              </div>

              {/* BB + MACD + RSI row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="glass-dark rounded-2xl border border-white/5 p-4">
                   <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Bollinger</h3>
                   <div className={`text-sm font-black mb-1 ${bbColor(d1.bb_position)} text-glow`}>{d1.bb_position ?? "—"}</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase mb-2">
                     <span className={d1.bb_width_label === "COMPRIMIDO" ? "text-amber-400" : d1.bb_width_label === "EXPANDIDO" ? "text-sentinela-emerald" : "text-slate-500"}>
                       {d1.bb_width_label ?? "—"}
                     </span>
                     {d1.bb_width != null && (
                       <span className="text-slate-600 ml-1">({fmtNum(d1.bb_width * 100, 1)}%)</span>
                     )}
                   </div>
                   <div className="text-[8px] font-mono text-slate-600">
                     U: ${fmtPrice(d1.bb_upper)} <br/> L: ${fmtPrice(d1.bb_lower)}
                   </div>
                </div>

                <div className="glass-dark rounded-2xl border border-white/5 p-4">
                   <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">MACD Momentum</h3>
                   <div className={`text-sm font-black mb-1 ${macdColor(d1.macd_cross)} text-glow`}>{d1.macd_cross ?? "—"}</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase mb-2">{d1.macd_momentum ?? "—"}</div>
                   <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${d1.macd_above_zero ? 'bg-sentinela-emerald glow-emerald' : 'bg-rose-500 glow-blue'}`} />
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{d1.macd_above_zero ? "Above Zero" : "Below Zero"}</span>
                   </div>
                </div>

                <div className="glass-dark rounded-2xl border border-white/5 p-4">
                   <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5">RSI Strength</h3>
                   <div className={`text-2xl font-mono font-black mb-2 ${rsiColor(d1.rsi)} text-glow`}>{fmtNum(d1.rsi)}</div>
                   <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${(d1.rsi ?? 50) >= 70 ? "bg-rose-500" : (d1.rsi ?? 50) <= 30 ? "bg-sentinela-emerald" : "bg-sentinela-blue"}`}
                        style={{ width: `${Math.min(100, d1.rsi ?? 50)}%` }}
                      />
                   </div>
                </div>
              </div>

              {/* ADX + ATR + POC */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCell
                  label="ADX Trend"
                  value={<>{fmtNum(d1.adx)} <span className="text-[9px] opacity-60">({d1.adx_label ?? "—"})</span></>}
                  valueClass={adxColor(d1.adx_label)}
                />
                <StatCell
                  label="Directional"
                  value={`${fmtNum(d1.plus_di)} / ${fmtNum(d1.minus_di)}`}
                  valueClass={(d1.plus_di ?? 0) > (d1.minus_di ?? 0) ? "text-sentinela-emerald" : "text-rose-400"}
                />
                <StatCell
                  label="Volatility (ATR)"
                  value={<>${fmtPrice(d1.atr)} <span className="text-[9px] opacity-50">({fmtNum(d1.atr_pct)}%)</span></>}
                />
                <StatCell
                  label="POC Pivot"
                  value={<>${fmtPrice(result.poc)} <span className="text-[9px]">{pocLabel}</span></>}
                />
              </div>
            </TabsContent>

            <TabsContent value="4h" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCell label="Bollinger 4H" value={d4.bb_position ?? "—"} valueClass={bbColor(d4.bb_position)} />
                <StatCell label="RSI 4H" value={fmtNum(d4.rsi)} valueClass={rsiColor(d4.rsi)} />
                <StatCell label="VMC Signal" value={d4.vmc_dot ?? "—"} valueClass={d4.vmc_dot === "GREEN" ? "text-sentinela-emerald text-glow" : "text-rose-500 text-glow"} />
                <StatCell label="WT1 Momentum" value={d4.wt1} valueClass={(d4.wt1 ?? 0) > 0 ? "text-sentinela-emerald" : "text-rose-400"} />
                <StatCell label="WT Direction" value={d4.wt_dir ?? "—"} valueClass={d4.wt_dir === "UP" ? "text-sentinela-emerald" : "text-rose-400"} />
                <StatCell label="MACD 4H" value={d4.macd_cross || "NEUTRAL"} valueClass={macdColor(d4.macd_cross)} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Trade Setup Signal - NEW */}
          {result.setup && result.setup.tipo !== 'NEUTRO' && (
            <TradeSetupBlock setup={result.setup} />
          )}

          {/* S/R Levels */}
          <div className="glass-dark rounded-2xl border border-white/5 p-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Institutional S/R Levels (Swing)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                {(result.resistances ?? []).slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 transition-colors">
                    <div className="flex items-center gap-2">
                       <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
                       <span className="text-[10px] font-black text-rose-300 uppercase">Resist {i + 1}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-rose-400 text-glow">${fmtPrice(r)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {(result.supports ?? []).slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-sentinela-emerald/5 border border-sentinela-emerald/10 hover:border-sentinela-emerald/30 transition-colors">
                    <div className="flex items-center gap-2">
                       <ChevronDown className="w-3.5 h-3.5 text-sentinela-emerald" />
                       <span className="text-[10px] font-black text-sentinela-emerald uppercase">Supp {i + 1}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-sentinela-emerald text-glow">${fmtPrice(s)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="glass-dark rounded-2xl border border-sentinela-blue/20 p-4 shadow-lg glow-blue relative overflow-hidden">
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
