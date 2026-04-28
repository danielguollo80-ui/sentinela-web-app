"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw, 
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface StockAnalysis {
  symbol: string;
  price: number;
  rsi: number;
  trend: string;
  ai_analysis: string;
  timestamp: number;
}

export function StocksGrid() {
  const [stocks, setStocks] = useState<Record<string, StockAnalysis>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync?bot=stocks");
      if (!res.ok) throw new Error("Falha ao carregar ações");
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl mt-8">
        <p className="text-rose-400 font-bold uppercase tracking-widest text-xs">{error}</p>
        <button onClick={fetchStocks} className="mt-4 text-emerald-400 text-[10px] font-black uppercase tracking-widest">Tentar novamente</button>
      </div>
    );
  }

  const stockList = Object.values(stocks);

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between mb-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stockList.map((stock) => {
          const isBullish = stock.trend === "Bullish";
          const verdict = stock.ai_analysis.includes("COMPRA") ? "COMPRA" : 
                          stock.ai_analysis.includes("VENDA") ? "VENDA" : "AGUARDAR";
          
          const verdictColor = verdict === "COMPRA" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
                               verdict === "VENDA" ? "text-rose-400 bg-rose-400/10 border-rose-400/20" :
                               "text-amber-400 bg-amber-400/10 border-amber-400/20";

          return (
            <Card key={stock.symbol} className="overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-xl hover:border-emerald-500/30 transition-all group relative">
              <div className={`absolute top-0 left-0 w-full h-1 ${isBullish ? "bg-emerald-500/50" : "bg-rose-500/50"}`} />
              
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center font-black text-lg text-white group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                      {stock.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black text-white tracking-tighter">{stock.symbol}</CardTitle>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        {isBullish ? <TrendingUp className="w-2.5 h-2.5 text-emerald-400" /> : <TrendingDown className="w-2.5 h-2.5 text-rose-400" />}
                        {stock.trend}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-black text-white">${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-full border mt-1 inline-block ${verdictColor}`}>
                      {verdict}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* AI Snippet */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 relative overflow-hidden">
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium italic">
                    "{stock.ai_analysis.split('\n')[0].replace('📊', '').replace('**', '').trim()}"
                  </p>
                </div>

                {/* Indicators Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">RSI Status</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black font-mono ${stock.rsi > 70 ? "text-rose-400" : stock.rsi < 30 ? "text-emerald-400" : "text-slate-300"}`}>
                        {stock.rsi.toFixed(1)}
                      </span>
                      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/50" style={{ width: `${stock.rsi}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Last Update</p>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(stock.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Link Shortcut */}
                <a 
                  href={`https://finance.yahoo.com/quote/${stock.symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all"
                >
                  Ver no Yahoo Finance <ExternalLink className="w-3 h-3" />
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
