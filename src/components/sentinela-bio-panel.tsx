"use client";

import React from 'react';
import { Shield, Activity, Target } from 'lucide-react';

interface SentinelaBioPanelProps {
  symbol: string;
  price: string;
  rsi: number;
  wt: number;
  trend: string;
  s_1h?: string;
  r_1h?: string;
  s_4h?: string;
  r_4h?: string;
  verdict: string;
}

export const SentinelaBioPanel: React.FC<SentinelaBioPanelProps> = ({
  symbol,
  price,
  rsi,
  wt,
  trend,
  s_1h,
  r_1h,
  s_4h,
  r_4h,
  verdict
}) => {
  return (
    <div className="relative z-10 grid grid-cols-12 gap-8 items-center bg-slate-950/70 backdrop-blur-md border-t border-slate-800/80 p-6 mt-auto">
      
      {/* Symbol & Price Section */}
      <div className="col-span-2 space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">{symbol} ANALYSIS</p>
          <p className="text-4xl font-black text-amber-500 tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">${price}</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
          <Activity className="w-3 h-3 text-sky-400" />
          <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider">{trend}</span>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="col-span-3 space-y-5 border-l border-slate-800/10 pl-10 pr-10">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] font-mono whitespace-nowrap">RSI</span>
          <span className="text-3xl font-black text-white italic">{rsi}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] font-mono whitespace-nowrap">WAVETREND</span>
          <span className="text-3xl font-black text-white italic">{wt}</span>
        </div>
      </div>

      {/* Market Levels Grid */}
      <div className="col-span-4 grid grid-cols-1 gap-6 border-l border-slate-800/50 pl-8">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">MACRO LEVELS (4H)</p>
          <div className="flex justify-between items-center text-lg">
             <span className="text-rose-500 font-black tracking-tight">R: ${r_4h || "---"}</span>
             <span className="text-emerald-500 font-black tracking-tight">S: ${s_4h || "---"}</span>
          </div>
        </div>
        <div className="h-[1px] bg-slate-800/50 w-full" />
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">INTRADAY (1H)</p>
          <div className="flex justify-between items-center text-lg">
             <span className="text-rose-400 font-black tracking-tight">R: ${r_1h || "---"}</span>
             <span className="text-emerald-400 font-black tracking-tight">S: ${s_1h || "---"}</span>
          </div>
        </div>
      </div>

      {/* AI Verdict Section */}
      <div className="col-span-3 flex flex-col items-start gap-4 border-l border-slate-800/50 pl-8">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-500" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">SENTINELAAI VERDICT</p>
        </div>
        <p className="text-sm font-black text-slate-100 leading-relaxed tracking-tight italic">
          "{verdict}"
        </p>
      </div>

    </div>
  );
};
