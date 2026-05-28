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
  const isLong = setup?.tipo === 'LONG' || setup?.tipo === 'POSSIBLE_BOTTOM';
  const colorClass = isLong ? 'sentinela-emerald' : 'rose-500';
  const glowClass = isLong ? 'glow-emerald' : 'glow-rose';

  return (
    <div className="relative z-10 grid grid-cols-12 gap-0 items-stretch glass backdrop-blur-3xl border-t border-white/10 mt-auto rounded-b-[2.5rem] overflow-hidden min-h-[160px]">
      
      {/* Symbol & Price Section */}
      <div className="col-span-4 p-6 flex flex-col justify-center bg-slate-950/40">
        <div className="space-y-0.5">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] font-mono">{symbol} ANALYSIS</p>
          <p className="text-4xl font-black text-white tracking-tighter">${price}</p>
        </div>
        <div className="mt-2 inline-flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-mono">{trend}</span>
        </div>
      </div>

      {/* Trade Setup Section */}
      <div className="col-span-5 p-6 border-x border-white/5 bg-slate-950/20 flex flex-col justify-center">
        {isSetup ? (
          <>
            <div className="flex items-center gap-2 mb-3">
               <div className={`w-2 h-2 rounded-full bg-${colorClass} animate-ping`} />
               <p className={`text-[10px] font-black text-${colorClass} uppercase tracking-[0.2em] font-mono`}>
                  POSSÍVEL {isLong ? 'FUNDO (LONG)' : 'TOPO (SHORT)'} • {setup.score}/10
               </p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
               <div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Entrada</span>
                  <span className="text-lg font-black text-white font-mono">${setup.entrada.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
               </div>
               <div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Target</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">${setup.alvo1.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
               </div>
               <div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">Stop</span>
                  <span className="text-lg font-black text-rose-400 font-mono">${setup.stop.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
               </div>
               <div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">R/R</span>
                  <span className="text-lg font-black text-sky-400 font-mono">{setup.rr.toFixed(1)}x</span>
               </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Aguardando Setup de Elite...</p>
          </div>
        )}
      </div>

      {/* Technical Indicators */}
      <div className="col-span-3 p-6 flex flex-col justify-center gap-4 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">RSI</span>
          <span className="text-3xl font-black text-slate-200 font-mono">{rsi}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">WT</span>
          <span className="text-3xl font-black text-slate-200 font-mono">{wt}</span>
        </div>
      </div>
    </div>
  );
};
