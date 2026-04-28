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
  const colorClass = isLong ? 'text-emerald-400' : 'text-rose-400';
  const borderClass = isLong ? 'border-emerald-500/30' : 'border-rose-500/30';
  const bgClass = isLong ? 'bg-emerald-950/20' : 'bg-rose-950/20';

  return (
    <Card className={`overflow-hidden border border-white/10 ${bgClass} glass-dark rounded-2xl`}>
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className={`text-base font-black text-${colorClass} uppercase tracking-widest`}>
              POSSÍVEL {isLong ? 'FUNDO — PODE COMPRAR' : 'TOPO — PODE VENDER'}
            </CardTitle>
          </div>
          <Badge className={`bg-${colorClass}/20 text-${colorClass} border-${colorClass}/30 font-black px-4 py-1.5 text-sm`}>
            {setup.score}/10
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Confluências Detectadas:</p>
          <div className="flex flex-wrap gap-2">
            {setup.fatores.map((f, i) => (
              <span key={i} className="text-xs font-bold text-slate-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p className="text-xs font-black text-slate-500 uppercase mb-2">Entrada</p>
            <p className="text-lg font-black text-white font-mono">${setup.entrada.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p className="text-xs font-black text-slate-500 uppercase mb-2">Stop Loss</p>
            <p className="text-lg font-black text-rose-400 font-mono">${setup.stop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p className="text-xs font-black text-slate-500 uppercase mb-2">Alvo 1</p>
            <p className="text-lg font-black text-emerald-400 font-mono">${setup.alvo1.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30">
            <p className="text-xs font-black text-blue-400 uppercase mb-2">R/R Ratio</p>
            <p className="text-lg font-black text-white font-mono">{setup.rr.toFixed(1)}x</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function fmtPrice(v?: number | null, decimals = 2) {
  if (v == null) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: 8 });
}

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
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-900/60 border border-white/5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-lg font-mono font-bold ${valueClass || "text-white"}`}>{value}</span>
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

  const d1 = result?.indicators_1d ?? {};
  const d4 = result?.indicators_4h ?? {};

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <form onSubmit={(e) => { e.preventDefault(); analyze(query); }} className="flex gap-3 mb-8">
        <Input placeholder="Ex: BTC, ETH..." value={query} onChange={(e) => setQuery(e.target.value)} className="bg-slate-950 border-white/10 text-white h-14 text-lg rounded-xl" />
        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 h-14 text-lg font-bold rounded-xl text-white">ANALISAR</Button>
      </form>

      {/* Quick Shortcuts */}
      <div className="space-y-4 mb-10">
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Day Trade Monitor</span>
          <div className="flex flex-wrap gap-2">
            {['BTC', 'ETH', 'SOL', 'AVAX', 'PEPE', 'JUP', 'POL'].map((coin) => (
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
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Swing Trade Elite</span>
          <div className="flex flex-wrap gap-2">
            {['TAO', 'SUI', 'RENDER', 'LINK', 'HYPE', 'PENDLE'].map((coin) => (
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
      {result && !loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 glass-dark rounded-2xl border border-white/10 bg-slate-900/40">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Asset</div>
              <div className="text-4xl font-black text-white">{result.symbol}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-mono font-black text-blue-400">${fmtPrice(result.price, 4)}</div>
              <div className={`text-sm font-bold mt-2 ${fngColor(result.fng)}`}>FNG {result.fng} • {result.fng_label.toUpperCase()}</div>
            </div>
          </div>

          <Tabs defaultValue="1d">
            <TabsList className="bg-slate-950 p-1 h-14 w-full rounded-xl">
              <TabsTrigger value="1d" className="flex-1 text-sm font-bold">DIÁRIO (1D)</TabsTrigger>
              <TabsTrigger value="4h" className="flex-1 text-sm font-bold">TÁTICO (4H)</TabsTrigger>
            </TabsList>
            <TabsContent value="1d" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCell label="Tendência EMA" value={d1.ema_position ?? "—"} valueClass={emaColor(d1.ema_position)} />
                <StatCell label="RSI" value={fmtNum(d1.rsi)} valueClass={rsiColor(d1.rsi)} />
                <StatCell label="ADX" value={fmtNum(d1.adx)} valueClass={adxColor(d1.adx_label)} />
                <StatCell label="Bollinger" value={d1.bb_position ?? "—"} valueClass={bbColor(d1.bb_position)} />
                <StatCell label="MACD" value={d1.macd_cross ?? "—"} valueClass={macdColor(d1.macd_cross)} />
                <StatCell label="ATR" value={`$${fmtPrice(d1.atr, 2)}`} />
              </div>
            </TabsContent>
            <TabsContent value="4h" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCell label="RSI 4H" value={fmtNum(d4.rsi)} valueClass={rsiColor(d4.rsi)} />
                <StatCell label="VMC" value={d4.vmc_dot ?? "—"} valueClass={d4.vmc_dot === "GREEN" ? "text-emerald-400" : "text-rose-400"} />
                <StatCell label="WT1" value={d4.wt1?.toFixed(2)} valueClass={(d4.wt1 ?? 0) > 0 ? "text-emerald-400" : "text-rose-400"} />
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
                {result.supports.slice(0, 3).map((s: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-emerald-500/30 rounded-full" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Support {i + 1}</span>
                    </div>
                    <span className="text-sm font-mono font-black text-white">${fmtPrice(s)}</span>
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
                {result.resistances.slice(0, 3).map((r: number, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-rose-500/30 rounded-full" />
                      <span className="text-[10px] font-black text-rose-400 uppercase">Resistance {i + 1}</span>
                    </div>
                    <span className="text-sm font-mono font-black text-white">${fmtPrice(r)}</span>
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
