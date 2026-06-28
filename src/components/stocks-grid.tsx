"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IndicatorData {
  rsi?: number;
  macd_cross?: string;
  macd_above_zero?: boolean;
  bb_position?: string;
  bb_upper?: number;
  bb_lower?: number;
  ema_position?: string;
  ema21?: number;
  ema50?: number;
  ema200?: number;
  adx?: number;
  adx_label?: string;
  atr?: number;
  atr_pct?: number;
  plus_di?: number;
  minus_di?: number;
  volume_ratio?: number;
}

interface StockAnalysis {
  symbol: string;
  price: number;
  rsi: number;
  trend: string;
  ai_analysis: string;
  timestamp: number;
  last_update?: string;
  supports?: number[];
  resistances?: number[];
  indicators_1d?: IndicatorData;
  indicators_4h?: IndicatorData;
  indicators_1h?: IndicatorData;
  indicators_15m?: IndicatorData;
  indicators_5m?: IndicatorData;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
}

const QUICK_TECH = ['NVDA', 'TSLA', 'AMD', 'AAPL', 'AMZN', 'GOOGL'];
const QUICK_WATCH = ['MSTR', 'ARM'];
const QUICK_INDICES = ['SPY', 'QQQ'];

function fmtPrice(v: number) {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />;
}

function StatCell({ label, value, valueClass = "" }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-5 rounded-2xl bg-slate-900/60 border border-white/5 shadow-sm hover:bg-slate-800/40 transition-colors">
      <span className="text-[15px] font-black uppercase tracking-widest text-white/70">{label}</span>
      <span className={`text-2xl md:text-3xl font-mono font-black ${valueClass || "text-white"}`}>{value}</span>
    </div>
  );
}

function stripHtml(text: string) {
  return text.replace(/<[^>]*>?/gm, '');
}

function parseAnalysis(text: string) {
  const cleanText = stripHtml(text);
  const data: Record<string, string> = {};
  
  // Regex mais robusto para pegar chaves mesmo se estiverem na mesma linha ou com tags
  const keys = ["SYMBOL", "VEREDITO", "SCORE", "TÉCNICO", "INDICADORES", "SETUP", "RISCO"];
  
  keys.forEach(key => {
    const regex = new RegExp(`${key}:?\\s*([^\\n|]+)`, "i");
    const match = cleanText.match(regex);
    if (match) {
      data[key] = match[1].trim();
    }
  });

  // Fallback para SCORE se não achar com o regex acima (ex: SCORE: 7/10)
  if (!data["SCORE"]) {
    const scoreMatch = cleanText.match(/(\d+\/\d+)/);
    if (scoreMatch) data["SCORE"] = scoreMatch[0];
  }

  // Parse Setup: Entrada $X | Stop $X | Alvo $X | R/R X:1
  const setupRaw = data["SETUP"] || "";
  const setupParts = setupRaw.split(/[|/]/).map(p => p.trim());
  const setup: Record<string, string> = {};
  
  setupParts.forEach(p => {
    if (p.toLowerCase().includes("entrada")) setup.entrada = p.replace(/entrada/i, "").trim();
    if (p.toLowerCase().includes("stop")) setup.stop = p.replace(/stop/i, "").trim();
    if (p.toLowerCase().includes("alvo")) setup.target = p.replace(/alvo/i, "").trim();
    if (p.toLowerCase().includes("r/r")) setup.rr = p.replace(/r\/r/i, "").trim();
  });

  return {
    verdict: data["VEREDITO"] || "NEUTRO",
    score: data["SCORE"] || "0/10",
    tecnico: data["TÉCNICO"] || data["INDICADORES"] || "",
    risco: data["RISCO"] || "",
    setup: Object.keys(setup).length > 0 ? setup : null
  };
}

function rsiColor(rsi?: number) {
  if (!rsi) return "text-slate-400";
  if (rsi >= 70) return "text-rose-400";
  if (rsi <= 30) return "text-emerald-400";
  return "text-white";
}

function emaColor(pos?: string) {
  if (!pos) return "text-slate-400";
  if (pos.includes("BULLISH")) return "text-emerald-400";
  if (pos.includes("BEARISH")) return "text-rose-400";
  return "text-white";
}

function adxColor(label?: string) {
  if (!label) return "text-slate-400";
  if (label.includes("FORTE")) return "text-emerald-400";
  if (label.includes("MODERADO")) return "text-yellow-500";
  return "text-slate-300";
}

function bbColor(pos?: string) {
  if (!pos) return "text-slate-400";
  if (pos.includes("SUPERIOR")) return "text-rose-400";
  if (pos.includes("INFERIOR")) return "text-emerald-400";
  return "text-yellow-500";
}

function macdColor(cross?: string) {
  if (!cross) return "text-slate-400";
  if (cross.includes("ALTA") || cross.includes("BULL")) return "text-emerald-400";
  if (cross.includes("BAIXA") || cross.includes("BEAR")) return "text-rose-400";
  return "text-white";
}

function fmtNum(v?: number | null, d = 1) {
  if (v == null) return "—";
  return Number(v).toFixed(d);
}

function volColor(ratio?: number) {
  if (!ratio) return "text-slate-400";
  if (ratio >= 2) return "text-emerald-400";
  if (ratio >= 1.2) return "text-yellow-400";
  return "text-slate-400";
}

function SearchResult({ stock }: { stock: StockAnalysis }) {
  const parsed = parseAnalysis(stock.ai_analysis);
  const isBuy = parsed.verdict.includes("COMPRA") || parsed.verdict.includes("LONG");
  const isSell = parsed.verdict.includes("VENDA") || parsed.verdict.includes("SHORT");
  const d1   = stock.indicators_1d;
  const d4h  = stock.indicators_4h;
  const d1h  = stock.indicators_1h;
  const d15m = stock.indicators_15m;
  const d5m  = stock.indicators_5m;

  const auditColor = isBuy
    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
    : isSell
    ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
    : "bg-amber-500/20 border-amber-500/40 text-amber-400";
  const dotColor = isBuy ? "bg-emerald-400 animate-pulse" : isSell ? "bg-rose-400" : "bg-amber-400";

  return (
    <div className="space-y-6">
      {/* Elite Horizontal Analysis Bar */}
      <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/10">

          {/* SECTION 1: ASSET & PRICE */}
          <div className="lg:col-span-4 p-4 flex flex-col justify-center bg-slate-950/40">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="text-[16px] font-black uppercase tracking-[0.2em] text-slate-200">{stock.symbol} ANALYSIS</div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black border border-blue-500/30">PRO</span>
            </div>
            <div className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-0.5">${fmtPrice(stock.price)}</div>
            {stock.preMarketPrice && (
              <div className={`text-[9px] font-bold tracking-wide mb-0.5 ${(stock.preMarketChange ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Pré-Market: ${fmtPrice(stock.preMarketPrice)} {(stock.preMarketChange ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.preMarketChangePercent ?? 0).toFixed(2)}%
              </div>
            )}
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest w-fit ${auditColor}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              IA AUDIT: {parsed.verdict}
            </div>
          </div>

          {/* SECTION 2: TRADE SETUP */}
          <div className="lg:col-span-5 p-4 grid grid-cols-2 gap-y-2 gap-x-6 items-center border-r border-white/10 bg-slate-950/20">
            {parsed.setup ? (
              <>
                <div className="col-span-2 flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBuy ? 'COMPRA' : 'VENDA'} • {parsed.score}
                  </span>
                </div>
                <div>
                  <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Entrada</div>
                  <div className="text-xl md:text-2xl font-mono font-black text-white">{parsed.setup.entrada}</div>
                </div>
                <div>
                  <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Target</div>
                  <div className="text-xl md:text-2xl font-mono font-black text-emerald-400">{parsed.setup.target}</div>
                </div>
                <div>
                  <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">Stop</div>
                  <div className="text-xl md:text-2xl font-mono font-black text-rose-400">{parsed.setup.stop}</div>
                </div>
                <div>
                  <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">R/R</div>
                  <div className="text-xl md:text-2xl font-black text-blue-400">{parsed.setup.rr}</div>
                </div>
              </>
            ) : (
              <div className="col-span-2 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic py-4">
                {parsed.tecnico || "Aguardando setup de elite..."}
              </div>
            )}
          </div>

          {/* SECTION 3: RSI 1D + ADX 1D */}
          <div className="lg:col-span-3 p-4 flex flex-col justify-center gap-3 bg-slate-950/40">
            <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-1">
              <span className="text-[12px] font-black text-white uppercase tracking-widest">RSI <span className="text-slate-500 font-medium normal-case">1D</span></span>
              <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${rsiColor(stock.rsi)}`}>
                {stock.rsi.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-1">
              <span className="text-[12px] font-black text-white uppercase tracking-widest">ADX <span className="text-slate-500 font-medium normal-case">1D</span></span>
              <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${adxColor(d1?.adx_label)}`}>
                {fmtNum(d1?.adx)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* TABS — 3 TFs igual ao crypto */}
      <Tabs defaultValue="1d" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/80 p-1.5 h-14 rounded-2xl border border-slate-800/50 backdrop-blur-md shadow-2xl">
          <TabsTrigger value="1d" className="rounded-xl font-black text-[10px] md:text-xs tracking-wider transition-all duration-200 text-white bg-slate-800/80 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg">
            ESTRATÉGICO (1D)
          </TabsTrigger>
          <TabsTrigger value="4h" className="rounded-xl font-black text-[10px] md:text-xs tracking-wider transition-all duration-200 text-white bg-slate-800/80 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg">
            TÁTICO (4H)
          </TabsTrigger>
          <TabsTrigger value="scalp" className="rounded-xl font-black text-[10px] md:text-xs tracking-wider transition-all duration-200 text-white bg-slate-800/80 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg">
            SCALP (1H/15M/5M)
          </TabsTrigger>
        </TabsList>

        {/* ABA 1D — igual ao crypto: Tendência 1D, Tendência 4H, RSI, ADX, DI+, DI-, MACD, ATR%, Volume */}
        <TabsContent value="1d" className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCell label="Tendência 1D" value={d1?.ema_position ?? "—"} valueClass={emaColor(d1?.ema_position)} />
            <StatCell label="Tendência 4H" value={d4h?.ema_position ?? "—"} valueClass={emaColor(d4h?.ema_position)} />
            <StatCell label="RSI" value={fmtNum(stock.rsi)} valueClass={rsiColor(stock.rsi)} />
            <StatCell label="ADX" value={fmtNum(d1?.adx)} valueClass={adxColor(d1?.adx_label)} />
            <StatCell label="DI+" value={fmtNum(d1?.plus_di)} valueClass="text-emerald-400" />
            <StatCell label="DI-" value={fmtNum(d1?.minus_di)} valueClass="text-rose-400" />
            <StatCell label="MACD" value={d1?.macd_cross ?? "—"} valueClass={macdColor(d1?.macd_cross)} />
            <StatCell label="ATR 1D" value={d1?.atr_pct != null ? `${fmtNum(d1.atr_pct)}%` : "—"} valueClass={(d1?.atr_pct ?? 0) >= 3 ? "text-emerald-400" : "text-white"} />
            <StatCell label="Volume 1D" value={d1?.volume_ratio != null ? `${fmtNum(d1.volume_ratio, 2)}x` : "—"} valueClass={volColor(d1?.volume_ratio)} />
          </div>
        </TabsContent>

        {/* ABA 4H — igual ao crypto: RSI, MACD, ADX, DI+, DI-, Volume, ATR% */}
        <TabsContent value="4h" className="mt-6 space-y-4">
          {d4h ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCell label="RSI 4H" value={fmtNum(d4h.rsi)} valueClass={rsiColor(d4h.rsi)} />
              <StatCell label="MACD 4H" value={d4h.macd_cross ?? "—"} valueClass={macdColor(d4h.macd_cross)} />
              <StatCell label="ADX 4H" value={fmtNum(d4h.adx)} valueClass={adxColor(d4h.adx_label)} />
              <StatCell label="DI+ 4H" value={fmtNum(d4h.plus_di)} valueClass="text-emerald-400" />
              <StatCell label="DI- 4H" value={fmtNum(d4h.minus_di)} valueClass="text-rose-400" />
              <StatCell label="Bollinger 4H" value={d4h.bb_position ?? "—"} valueClass={bbColor(d4h.bb_position)} />
              <StatCell label="ATR 4H" value={d4h.atr_pct != null ? `${fmtNum(d4h.atr_pct)}%` : "—"} valueClass={(d4h.atr_pct ?? 0) >= 1.5 ? "text-emerald-400" : "text-white"} />
              <StatCell label="Volume 4H" value={d4h.volume_ratio != null ? `${fmtNum(d4h.volume_ratio, 2)}x` : "—"} valueClass={volColor(d4h.volume_ratio)} />
              <StatCell label="Score" value={parsed.score} valueClass="text-blue-400" />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Carregando dados 4H...</div>
          )}
        </TabsContent>

        {/* ABA SCALP — 3 seções: 1H / 15M / 5M igual ao crypto */}
        <TabsContent value="scalp" className="mt-6 space-y-5">
          {/* 1H */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Timeframe 1H</span>
            </div>
            {d1h ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCell label="RSI 1H" value={fmtNum(d1h.rsi)} valueClass={rsiColor(d1h.rsi)} />
                <StatCell label="MACD 1H" value={d1h.macd_cross ?? "—"} valueClass={macdColor(d1h.macd_cross)} />
                <StatCell label="ADX 1H" value={fmtNum(d1h.adx)} valueClass={adxColor(d1h.adx_label)} />
                <StatCell label="Volume 1H" value={d1h.volume_ratio != null ? `${fmtNum(d1h.volume_ratio, 2)}x` : "—"} valueClass={volColor(d1h.volume_ratio)} />
                <StatCell label="DI+ 1H" value={fmtNum(d1h.plus_di)} valueClass="text-emerald-400" />
                <StatCell label="DI- 1H" value={fmtNum(d1h.minus_di)} valueClass="text-rose-400" />
                <StatCell label="Tendência EMA" value={d1h.ema_position ?? "—"} valueClass={emaColor(d1h.ema_position)} />
                <StatCell label="ATR 1H" value={d1h.atr_pct != null ? `${fmtNum(d1h.atr_pct)}%` : "—"} />
              </div>
            ) : (
              <div className="p-4 text-center text-slate-600 text-xs italic">Carregando...</div>
            )}
          </div>
          {/* 15M */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Timeframe 15M</span>
            </div>
            {d15m ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCell label="RSI 15M" value={fmtNum(d15m.rsi)} valueClass={rsiColor(d15m.rsi)} />
                <StatCell label="MACD 15M" value={d15m.macd_cross ?? "—"} valueClass={macdColor(d15m.macd_cross)} />
                <StatCell label="ADX 15M" value={fmtNum(d15m.adx)} valueClass={adxColor(d15m.adx_label)} />
                <StatCell label="Volume 15M" value={d15m.volume_ratio != null ? `${fmtNum(d15m.volume_ratio, 2)}x` : "—"} valueClass={volColor(d15m.volume_ratio)} />
                <StatCell label="DI+ 15M" value={fmtNum(d15m.plus_di)} valueClass="text-emerald-400" />
                <StatCell label="DI- 15M" value={fmtNum(d15m.minus_di)} valueClass="text-rose-400" />
                <StatCell label="Tendência EMA" value={d15m.ema_position ?? "—"} valueClass={emaColor(d15m.ema_position)} />
                <StatCell label="ATR 15M" value={d15m.atr_pct != null ? `${fmtNum(d15m.atr_pct)}%` : "—"} />
              </div>
            ) : (
              <div className="p-4 text-center text-slate-600 text-xs italic">Carregando...</div>
            )}
          </div>
          {/* 5M */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Timeframe 5M</span>
            </div>
            {d5m ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCell label="RSI 5M" value={fmtNum(d5m.rsi)} valueClass={rsiColor(d5m.rsi)} />
                <StatCell label="MACD 5M" value={d5m.macd_cross ?? "—"} valueClass={macdColor(d5m.macd_cross)} />
                <StatCell label="ADX 5M" value={fmtNum(d5m.adx)} valueClass={adxColor(d5m.adx_label)} />
                <StatCell label="DI+ 5M" value={fmtNum(d5m.plus_di)} valueClass="text-emerald-400" />
                <StatCell label="DI- 5M" value={fmtNum(d5m.minus_di)} valueClass="text-rose-400" />
                <StatCell label="Volume 5M" value={d5m.volume_ratio != null ? `${fmtNum(d5m.volume_ratio, 2)}x` : "—"} valueClass={volColor(d5m.volume_ratio)} />
              </div>
            ) : (
              <div className="p-4 text-center text-slate-600 text-xs italic">Carregando...</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* S/R Levels — fora das abas, sempre visível */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-dark rounded-2xl border border-white/10 p-5 shadow-lg bg-slate-900/20">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Critical Support Levels
          </h3>
          <div className="space-y-3">
            {(stock.supports ?? []).slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-10 bg-emerald-500/40 rounded-full" />
                  <span className="text-xs md:text-sm font-black text-emerald-400 uppercase tracking-widest">Support {i + 1}</span>
                </div>
                <span className="text-base md:text-xl font-black text-white font-mono tracking-tighter">${fmtPrice(s)}</span>
              </div>
            ))}
            {(stock.supports ?? []).length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">Sem suportes disponíveis</p>}
          </div>
        </div>
        <div className="glass-dark rounded-2xl border border-white/10 p-5 shadow-lg bg-slate-900/20">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Critical Resistance Levels
          </h3>
          <div className="space-y-3">
            {(stock.resistances ?? []).slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-10 bg-rose-500/40 rounded-full" />
                  <span className="text-xs md:text-sm font-black text-rose-400 uppercase tracking-widest">Resistance {i + 1}</span>
                </div>
                <span className="text-base md:text-xl font-black text-white font-mono tracking-tighter">${fmtPrice(r)}</span>
              </div>
            ))}
            {(stock.resistances ?? []).length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">Sem resistências disponíveis</p>}
          </div>
        </div>
      </div>

      {/* AI Analysis — fora das abas, sempre visível */}
      <div className="glass-dark rounded-2xl border border-blue-500/20 p-4 shadow-lg relative overflow-hidden">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          AI QUANTITATIVE ANALYSIS — CLAUDE
        </h3>
        <div className="space-y-3">
          {stock.ai_analysis.split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="text-sm font-medium leading-relaxed px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-200">
              {stripHtml(line)}
            </div>
          ))}
        </div>
      </div>

      <a
        href={`https://finance.yahoo.com/quote/${stock.symbol}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all shadow-lg"
      >
        Ver no Yahoo Finance <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

export function StocksGrid() {
  const [stocks, setStocks] = useState<Record<string, StockAnalysis>>({});
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [gridError, setGridError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResult, setSearchResult] = useState<StockAnalysis | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchStocks = async () => {
    setLoadingGrid(true);
    try {
      const res = await fetch("/api/sync?bot=stocks");
      if (!res.ok) throw new Error("Falha ao carregar ações");
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      setGridError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoadingGrid(false);
    }
  };

  const analyzeStock = useCallback(async (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoadingSearch(true);
    setSearchError(null);
    setSearchResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch(`/api/sync?bot=stocks&symbol=${encodeURIComponent(s)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ação não encontrada");
      }
      const data = await res.json();
      setSearchResult(data.analysis);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
  }, []);

  const stockList = Object.values(stocks);

  return (
    <div className="space-y-6 mt-8">
      {/* Search Bar */}
      <form onSubmit={(e) => { e.preventDefault(); analyzeStock(query); }} className="flex gap-3">
        <Input
          placeholder="Ex: AAPL, PLTR, COIN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-slate-950 border-white/10 text-white h-14 text-lg rounded-xl"
        />
        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 h-14 text-lg font-bold rounded-xl text-white">
          ANALISAR
        </Button>
      </form>

      {/* Quick Shortcuts */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-widest ml-1">Tech Giants</span>
          <div className="flex flex-wrap gap-2">
            {QUICK_TECH.map((s) => (
              <button
                key={s}
                onClick={() => analyzeStock(s)}
                className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 text-xs font-black text-slate-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-400 transition-all uppercase tracking-widest"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-widest ml-1">Watchlist</span>
          <div className="flex flex-wrap gap-2">
            {QUICK_WATCH.map((s) => (
              <button
                key={s}
                onClick={() => analyzeStock(s)}
                className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 text-xs font-black text-slate-300 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400 transition-all uppercase tracking-widest"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-widest ml-1">Índices</span>
          <div className="flex flex-wrap gap-2">
            {QUICK_INDICES.map((s) => (
              <button
                key={s}
                onClick={() => analyzeStock(s)}
                className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 text-xs font-black text-slate-300 hover:bg-amber-500/20 hover:border-amber-500/50 hover:text-amber-400 transition-all uppercase tracking-widest"
              >
                {s === 'SPY' ? 'S&P 500' : 'Nasdaq'} ({s})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Result */}
      {loadingSearch && (
        <div className="space-y-4 mt-6">
          <SkeletonPulse className="h-24 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonPulse key={i} className="h-20" />)}
          </div>
          <SkeletonPulse className="h-40 w-full" />
        </div>
      )}
      {searchError && !loadingSearch && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
          <p className="text-rose-400 text-sm font-bold">⚠️ {searchError}</p>
        </div>
      )}
      {searchResult && !loadingSearch && <SearchResult stock={searchResult} />}

      {/* Grid */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-400" /> Monitoramento em Tempo Real
        </h2>
        <button
          onClick={fetchStocks}
          className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loadingGrid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : gridError ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <p className="text-rose-400 font-bold uppercase tracking-widest text-xs">{gridError}</p>
          <button onClick={fetchStocks} className="mt-4 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stockList.map((stock) => {
            const isBullish = stock.trend === "Bullish";
            const parsed = parseAnalysis(stock.ai_analysis);
            const verdict = parsed.verdict;
            
            const isBuy = verdict.includes("COMPRA");
            const isSell = verdict.includes("VENDA");
            
            const verdictColor = isBuy ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                               : isSell  ? "text-rose-400 bg-rose-400/10 border-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                               : "text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]";

            return (
              <Card
                key={stock.symbol}
                className="overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-xl hover:border-emerald-500/30 transition-all group relative cursor-pointer shadow-2xl"
                onClick={() => analyzeStock(stock.symbol)}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${isBullish ? "bg-emerald-500/50" : "bg-rose-500/50"}`} />

                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center font-black text-white text-xl shadow-inner">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-white tracking-tighter">{stock.symbol}</span>
                        <div className="flex items-center gap-1.5">
                          {isBullish
                            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stock.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono tracking-tighter">
                        ${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge className={`${verdictColor} font-black text-[10px] px-3 py-1 mt-2 border border-white/5`}>{verdict}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-2 space-y-5">
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 text-[14px] font-medium leading-relaxed text-slate-200 min-h-[120px] shadow-inner">
                    {stripHtml(stock.ai_analysis).length > 180 ? stripHtml(stock.ai_analysis).slice(0, 180) + "..." : stripHtml(stock.ai_analysis)}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 hover:bg-slate-800/50 transition-colors">
                      <span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">RSI Status</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-black font-mono ${stock.rsi > 70 ? 'text-rose-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-white'}`}>
                          {stock.rsi.toFixed(1)}
                        </span>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stock.rsi > 70 ? 'bg-rose-500' : stock.rsi < 30 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, stock.rsi)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 hover:bg-slate-800/50 transition-colors">
                      <span className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">Score</span>
                      <span className="text-2xl font-black text-slate-100 font-mono">
                        {parsed.score}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://finance.yahoo.com/quote/${stock.symbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all shadow-md"
                  >
                    Análise Completa <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
