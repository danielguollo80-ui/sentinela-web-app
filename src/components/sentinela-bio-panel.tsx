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
    <div className="relative z-10 grid grid-cols-12 gap-6 items-center glass backdrop-blur-xl border-t border-white/10 p-6 mt-auto rounded-b-[2.5rem]">
      
      {/* Symbol & Price Section */}
      <div className="col-span-3 space-y-2">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">{symbol} ANALYSIS</p>
          <p className="text-4xl font-black text-sentinela-blue tracking-tighter text-glow">${price}</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-sentinela-blue/10 px-3 py-1 rounded-full border border-sentinela-blue/30 glow-blue">
          <Activity className="w-3 h-3 text-sentinela-blue" />
          <span className="text-[10px] font-black text-sentinela-blue uppercase tracking-widest text-glow">{trend}</span>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="col-span-3 space-y-4 border-l border-white/5 pl-8 pr-8">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] font-mono whitespace-nowrap">RSI (14)</span>
          <span className="text-3xl font-black text-white italic text-glow">{rsi}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] font-mono whitespace-nowrap">WAVETREND</span>
          <span className="text-3xl font-black text-white italic text-glow">{wt}</span>
        </div>
      </div>

      {/* Market Levels Grid */}
      <div className="col-span-3 grid grid-cols-1 gap-4 border-l border-white/5 pl-8">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">MACRO LEVELS (4H)</p>
          <div className="flex justify-between items-center text-lg">
             <span className="text-rose-500 font-black tracking-tight text-glow">R: ${r_4h || "---"}</span>
             <span className="text-sentinela-emerald font-black tracking-tight text-glow">S: ${s_4h || "---"}</span>
          </div>
        </div>
        <div className="h-px bg-white/5 w-full" />
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">INTRADAY (1H)</p>
          <div className="flex justify-between items-center text-base">
             <span className="text-rose-400 font-black tracking-tight">R: ${r_1h || "---"}</span>
             <span className="text-emerald-400 font-black tracking-tight">S: ${s_1h || "---"}</span>
          </div>
        </div>
      </div>

      {/* AI Verdict Section */}
      <div className="col-span-3 flex flex-col items-start gap-3 border-l border-white/5 pl-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sentinela-blue glow-blue" />
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">SENTINELAAI VERDICT</p>
        </div>
        <p className="text-xs font-bold text-slate-200 leading-relaxed tracking-tight italic">
          "{verdict}"
        </p>
      </div>

    </div>
  );
};
