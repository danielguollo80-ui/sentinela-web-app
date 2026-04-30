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
  atr?: number;
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
}

const QUICK_TECH = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'AMD'];
const QUICK_WATCH = ['XOM', 'XPO', 'ARM', 'MRVL', 'TXN', 'SMR', 'OKLO', 'MSTR', 'RGTI', 'HIMS', 'RBLX'];

function fmtPrice(v: number) {
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-800/60 ${className}`} />;
}

function SearchResult({ stock }: { stock: StockAnalysis }) {
  const isBullish = stock.trend === "Bullish";
  const verdict = stock.ai_analysis.includes("COMPRA") ? "COMPRA"
                : stock.ai_analysis.includes("VENDA")  ? "VENDA"
                : "AGUARDAR";
  const verdictColor = verdict === "COMPRA" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                     : verdict === "VENDA"  ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
                     : "text-amber-400 bg-amber-400/10 border-amber-400/20";
  const rsiColor = stock.rsi > 70 ? 'text-rose-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-white';
  const d1 = stock.indicators_1d;

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
      <div className={`h-1 w-full ${isBullish ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`} />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-white text-xl">
              {stock.symbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter">{stock.symbol}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {isBullish
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                <span className={`text-[11px] font-black uppercase tracking-widest ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stock.trend}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white font-mono">${fmtPrice(stock.price)}</div>
            <Badge className={`${verdictColor} font-black text-[11px] px-3 py-1 mt-1`}>{verdict}</Badge>
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
            <span className="text-xs font-black text-slate-400 uppercase block mb-1">RSI</span>
            <span className={`text-2xl font-black font-mono ${rsiColor}`}>{stock.rsi.toFixed(1)}</span>
          </div>
          {d1?.ema_position && (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-xs font-black text-slate-400 uppercase block mb-1">EMA Trend</span>
              <span className={`text-sm font-black ${
                d1.ema_position.includes('BULLISH') ? 'text-emerald-400'
                : d1.ema_position.includes('BEARISH') ? 'text-rose-400'
                : 'text-white'
              }`}>{d1.ema_position}</span>
            </div>
          )}
          {d1?.macd_cross && (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-xs font-black text-slate-400 uppercase block mb-1">MACD</span>
              <span className={`text-sm font-black ${
                d1.macd_cross.includes('BULL') || d1.macd_cross.includes('ALTA') ? 'text-emerald-400' : 'text-rose-400'
              }`}>{d1.macd_cross}</span>
            </div>
          )}
          {d1?.adx != null && (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-xs font-black text-slate-400 uppercase block mb-1">ADX</span>
              <span className="text-2xl font-black font-mono text-white">{d1.adx.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* S/R Levels */}
        {(stock.supports?.length || stock.resistances?.length) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stock.supports && stock.supports.length > 0 && (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Suportes</span>
                {stock.supports.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-xs text-emerald-400 font-black">S{i + 1}</span>
                    <span className="text-sm font-mono font-black text-white">${fmtPrice(s)}</span>
                  </div>
                ))}
              </div>
            )}
            {stock.resistances && stock.resistances.length > 0 && (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Resistências</span>
                {stock.resistances.slice(0, 2).map((r, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-xs text-rose-400 font-black">R{i + 1}</span>
                    <span className="text-sm font-mono font-black text-white">${fmtPrice(r)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* AI Analysis */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-blue-500/20 space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI QUANTITATIVE ANALYSIS — CLAUDE
          </span>
          {stock.ai_analysis.split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="text-sm text-slate-200 leading-relaxed px-2 py-1.5 rounded-lg bg-slate-900/40">
              {line}
            </div>
          ))}
        </div>

        <a
          href={`https://finance.yahoo.com/quote/${stock.symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all"
        >
          Ver no Yahoo Finance <ExternalLink className="w-3 h-3" />
        </a>
      </div>
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
            const verdict = stock.ai_analysis.includes("COMPRA") ? "COMPRA"
                          : stock.ai_analysis.includes("VENDA")  ? "VENDA"
                          : "AGUARDAR";
            const verdictColor = verdict === "COMPRA" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                               : verdict === "VENDA"  ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
                               : "text-amber-400 bg-amber-400/10 border-amber-400/20";

            return (
              <Card
                key={stock.symbol}
                className="overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-xl hover:border-emerald-500/30 transition-all group relative cursor-pointer"
                onClick={() => analyzeStock(stock.symbol)}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${isBullish ? "bg-emerald-500/50" : "bg-rose-500/50"}`} />

                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white text-lg">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-white tracking-tighter">{stock.symbol}</span>
                        <div className="flex items-center gap-1.5">
                          {isBullish
                            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                          <span className={`text-[11px] font-black uppercase tracking-widest ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stock.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono">
                        ${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge className={`${verdictColor} font-black text-[11px] px-3 py-1 mt-1`}>{verdict}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-sm font-medium leading-relaxed text-slate-200 min-h-[140px]">
                    {stock.ai_analysis}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-xs font-bold uppercase block mb-2">RSI Status</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-black ${stock.rsi > 70 ? 'text-rose-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-white'}`}>
                          {stock.rsi.toFixed(1)}
                        </span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stock.rsi > 70 ? 'bg-rose-500' : stock.rsi < 30 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, stock.rsi)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-xs font-bold uppercase block mb-2">Last Update</span>
                      <span className="text-lg font-black text-slate-300">
                        {new Date(stock.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://finance.yahoo.com/quote/${stock.symbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all"
                  >
                    Ver no Yahoo Finance <ExternalLink className="w-3 h-3" />
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
