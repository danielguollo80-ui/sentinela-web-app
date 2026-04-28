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

export const SentinelaBioPanel: React.FC<SentinelaBioPanelProps> = ({
  symbol, price, rsi, wt, trend, s_1h, r_1h, s_4h, r_4h, verdict, setup
}) => {
  const isSetup = setup && setup.tipo !== 'NEUTRO';
  const isLong = setup?.tipo === 'LONG';
  const colorClass = isLong ? 'sentinela-emerald' : 'rose-500';
  const glowClass = isLong ? 'glow-emerald' : 'glow-rose';

  return (
    <div className="relative z-10 grid grid-cols-12 gap-4 items-center glass backdrop-blur-xl border-t border-white/10 p-4 mt-auto rounded-b-[2.5rem]">
      
      {/* Symbol & Price Section */}
      <div className={`${isSetup ? 'col-span-2' : 'col-span-3'} space-y-2`}>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">{symbol} ANALYSIS</p>
          <p className="text-2xl font-bold text-slate-100 tracking-tighter">${price}</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-600/40">
          <Activity className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trend}</span>
        </div>
      </div>

      {/* Trade Setup Section - NEW */}
      {isSetup && (
        <div className="col-span-4 border-l border-white/5 pl-6 pr-2 space-y-2">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full bg-${colorClass} ${glowClass}`} />
                 <p className={`text-[10px] font-black text-${colorClass} uppercase tracking-[0.1em] font-mono`}>
                    POSSÍVEL {isLong ? 'FUNDO (LONG)' : 'TOPO (SHORT)'}
                 </p>
              </div>
              <span className={`text-[10px] font-black bg-${colorClass}/20 text-${colorClass} px-2 py-0.5 rounded-md border border-${colorClass}/30`}>
                 {setup.score}/10
              </span>
           </div>
           
           <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
              <div className="flex justify-between border-b border-white/5 pb-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Entrada</span>
                 <span className="text-[11px] font-black text-white font-mono">${setup.entrada.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Target 1</span>
                 <span className="text-[11px] font-black text-emerald-400 font-mono">${setup.alvo1.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Stop Loss</span>
                 <span className="text-[11px] font-black text-rose-400 font-mono">${setup.stop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">R/R Ratio</span>
                 <span className="text-[11px] font-black text-sentinela-blue font-mono">{setup.rr.toFixed(1)}x</span>
              </div>
           </div>
        </div>
      )}

      {/* Technical Indicators */}
      <div className={`${isSetup ? 'col-span-2' : 'col-span-3'} space-y-4 border-l border-white/5 ${isSetup ? 'pl-6' : 'pl-8'} pr-2`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] font-mono whitespace-nowrap">RSI (14)</span>
          <span className={`${isSetup ? 'text-xl' : 'text-2xl'} font-bold text-slate-200`}>{rsi}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] font-mono whitespace-nowrap">WT</span>
          <span className={`${isSetup ? 'text-xl' : 'text-2xl'} font-bold text-slate-200`}>{wt}</span>
        </div>
      </div>

      {/* AI Verdict Section */}
      <div className={`${isSetup ? 'col-span-4' : 'col-span-6'} flex flex-col items-start gap-3 border-l border-white/5 pl-8`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sentinela-blue glow-blue" />
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">SENTINELAAI VERDICT</p>
        </div>
        <p className={`${isSetup ? 'text-[10px]' : 'text-xs'} font-medium text-slate-400 leading-tight tracking-tight line-clamp-3`}>
          &quot;{verdict}&quot;
        </p>
      </div>

    </div>
  );
};
