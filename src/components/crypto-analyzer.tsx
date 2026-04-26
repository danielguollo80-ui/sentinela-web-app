"use client";

import React, { useState, useCallback } from "react";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const QUICK_PICKS = ["BTC", "ETH", "SOL", "XRP", "BNB", "AVAX", "LINK", "AAVE", "TAO", "SUI"];

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
}

function fmtPrice(v?: number | null, decimals = 2) {
  if (v == null) return "—";
  return v >= 1000
    ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(v >= 1 ? decimals : 6);
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

export function CryptoAnalyzer() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/analyze/${encodeURIComponent(s)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
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

  return (
    <div className="container mx-auto px-4 sm:px-8 py-6 max-w-4xl">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <Input
            placeholder="Qualquer par: BTC, ETH, PEPE, SUI/USDT…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500/50 h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-40"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Analisar"}
        </Button>
      </form>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2 mt-3">
        {QUICK_PICKS.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); analyze(s); }}
            disabled={loading}
            className="px-3 py-1 text-xs font-bold rounded-full border border-slate-700 bg-slate-900/60 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {error && !loading && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-mono">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-6 space-y-4">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-lg font-black text-emerald-400">{result.symbol.split("/")[0].slice(0, 2)}</span>
              </div>
              <div>
                <div className="text-xl font-black text-white tracking-tight">{result.symbol}</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">${fmtPrice(result.price)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {result.squeeze && result.squeeze !== "Normal" && (
                <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 font-bold text-xs">
                  <Zap className="w-3 h-3 mr-1" /> {result.squeeze}
                </Badge>
              )}
              <div className={`text-sm font-bold ${fngColor(result.fng)}`}>
                FNG {result.fng} <span className="font-normal text-slate-500">({result.fng_label})</span>
              </div>
            </div>
          </div>

          {/* Tabs: 1D / 4H */}
          <Tabs defaultValue="1d">
            <TabsList className="bg-slate-900/60 border border-slate-800/60 w-full">
              <TabsTrigger value="1d" className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30">
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> 1D
              </TabsTrigger>
              <TabsTrigger value="4h" className="flex-1 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30">
                <Activity className="w-3.5 h-3.5 mr-1.5" /> 4H
              </TabsTrigger>
            </TabsList>

            <TabsContent value="1d" className="mt-3 space-y-3">
              {/* EMAs */}
              <Card className="bg-slate-900/40 border-slate-800/60">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> EMAs
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className={`text-sm font-bold mb-2 ${emaColor(d1.ema_position)}`}>
                    {d1.ema_position ?? "—"}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCell label="EMA 21" value={`$${fmtPrice(d1.ema21)}`} />
                    <StatCell label="EMA 50" value={`$${fmtPrice(d1.ema50)}`} />
                    <StatCell label="EMA 200" value={`$${fmtPrice(d1.ema200)}`} />
                  </div>
                </CardContent>
              </Card>

              {/* BB + MACD + RSI row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="bg-slate-900/40 border-slate-800/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Bollinger</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1">
                    <div className={`text-sm font-bold ${bbColor(d1.bb_position)}`}>{d1.bb_position ?? "—"}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      <span className={d1.bb_width_label === "COMPRIMIDO" ? "text-yellow-400" : d1.bb_width_label === "EXPANDIDO" ? "text-emerald-400" : "text-slate-400"}>
                        {d1.bb_width_label ?? "—"}
                      </span>
                      {d1.bb_width != null && (
                        <span className="text-slate-600 ml-1">({fmtNum(d1.bb_width * 100, 1)}%)</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      U: ${fmtPrice(d1.bb_upper)} / L: ${fmtPrice(d1.bb_lower)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">MACD</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-1">
                    <div className={`text-sm font-bold ${macdColor(d1.macd_cross)}`}>{d1.macd_cross ?? "—"}</div>
                    <div className="text-xs font-mono text-slate-400">{d1.macd_momentum ?? "—"}</div>
                    <div className="text-xs flex items-center gap-1">
                      {macdAboveIcon}
                      <span className="text-slate-500">{d1.macd_above_zero ? "acima do zero" : "abaixo do zero"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">RSI 14</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-2">
                    <div className={`text-2xl font-mono font-black ${rsiColor(d1.rsi)}`}>{fmtNum(d1.rsi)}</div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${(d1.rsi ?? 50) >= 70 ? "bg-red-400" : (d1.rsi ?? 50) <= 30 ? "bg-emerald-400" : "bg-slate-500"}`}
                        style={{ width: `${Math.min(100, d1.rsi ?? 50)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-600 flex justify-between">
                      <span>0</span><span>30</span><span>50</span><span>70</span><span>100</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ADX + ATR + POC */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCell
                  label="ADX"
                  value={<>{fmtNum(d1.adx)} <span className="text-xs font-normal text-slate-500">({d1.adx_label ?? "—"})</span></>}
                  valueClass={adxColor(d1.adx_label)}
                />
                <StatCell
                  label="+DI / -DI"
                  value={`${fmtNum(d1.plus_di)} / ${fmtNum(d1.minus_di)}`}
                  valueClass={(d1.plus_di ?? 0) > (d1.minus_di ?? 0) ? "text-emerald-400" : "text-red-400"}
                />
                <StatCell
                  label="ATR"
                  value={<>${fmtPrice(d1.atr)} <span className="text-slate-500">({fmtNum(d1.atr_pct)}%)</span></>}
                />
                <StatCell
                  label="POC"
                  value={<>${fmtPrice(result.poc)} <span className="text-xs">{pocLabel}</span></>}
                />
                {d1.divergence && (
                  <StatCell label="Divergência" value={d1.divergence} valueClass="text-yellow-400" />
                )}
                {d1.trend && (
                  <StatCell label="Tendência" value={d1.trend} valueClass="text-slate-300" />
                )}
              </div>
            </TabsContent>

            <TabsContent value="4h" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCell
                  label="BB 4H"
                  value={d4.bb_position ?? "—"}
                  valueClass={bbColor(d4.bb_position)}
                />
                <StatCell
                  label="BB Width"
                  value={<>{d4.bb_width_label ?? "—"} <span className="text-slate-500 text-xs">({fmtNum((d4.bb_width ?? 0) * 100, 1)}%)</span></>}
                  valueClass={d4.bb_width_label === "COMPRIMIDO" ? "text-yellow-400" : d4.bb_width_label === "EXPANDIDO" ? "text-emerald-400" : "text-slate-300"}
                />
                <StatCell
                  label="RSI 4H"
                  value={fmtNum(d4.rsi)}
                  valueClass={rsiColor(d4.rsi)}
                />
                <StatCell
                  label="VMC Dot"
                  value={d4.vmc_dot ?? "—"}
                  valueClass={d4.vmc_dot === "GREEN" ? "text-emerald-400" : d4.vmc_dot === "RED" ? "text-red-400" : "text-slate-400"}
                />
                <StatCell
                  label="WT1"
                  value={fmtNum(d4.wt1)}
                  valueClass={(d4.wt1 ?? 0) > 0 ? "text-emerald-400" : "text-red-400"}
                />
                <StatCell
                  label="WT Dir"
                  value={d4.wt_dir ?? "—"}
                  valueClass={d4.wt_dir === "UP" ? "text-emerald-400" : d4.wt_dir === "DOWN" ? "text-red-400" : "text-slate-400"}
                />
                {d4.macd_cross && (
                  <StatCell
                    label="MACD 4H"
                    value={d4.macd_cross}
                    valueClass={macdColor(d4.macd_cross)}
                  />
                )}
                {d4.divergence && (
                  <StatCell label="Divergência" value={d4.divergence} valueClass="text-yellow-400" />
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* S/R Levels */}
          <Card className="bg-slate-900/40 border-slate-800/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Suporte &amp; Resistência (Swing)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  {(result.resistances ?? []).slice(0, 3).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/8 border border-red-500/15">
                      <ChevronUp className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-xs text-red-300 font-mono font-bold">R{i + 1}: ${fmtPrice(r)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {(result.supports ?? []).slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/8 border border-emerald-500/15">
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-emerald-300 font-mono font-bold">S{i + 1}: ${fmtPrice(s)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card className="bg-slate-900/40 border border-emerald-500/15">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Análise IA — Claude
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {result.ai_analysis ? (
                <AiAnalysisBlock text={result.ai_analysis} />
              ) : (
                <p className="text-sm text-slate-500 italic">Análise indisponível.</p>
              )}
            </CardContent>
          </Card>

          {/* News */}
          {result.news_pt && (
            <p className="text-xs text-slate-600 font-mono px-1">
              📰 {result.news_pt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
