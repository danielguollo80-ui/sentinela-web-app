"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Flag, Activity, AlertCircle, Zap, Shield } from 'lucide-react';

interface MatchAnalysisPanelProps {
  match: string;
  time: string;
  factors: {
    favorite: string;
    goals: string;
    ht_goals: string;
    btts: string;
    corners: string;
    shots: string;
    on_target: string;
    cards: string;
  };
}

export const MatchAnalysisPanel: React.FC<MatchAnalysisPanelProps> = ({
  match,
  time,
  factors
}) => {
  const teams = match.split(' vs ');
  const team1 = teams[0] || "Time 1";
  const team2 = teams[1] || "Time 2";

  // Lógica de "Fonte Inteligente" para evitar estouro horizontal nos 1200px
  const getFontSize = (name: string) => {
    const len = name.length;
    if (len > 25) return "text-2xl";
    if (len > 18) return "text-3xl";
    if (len > 12) return "text-4xl";
    if (len > 8) return "text-5xl";
    return "text-6xl";
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full relative overflow-hidden flex flex-col justify-between px-8 py-10 bg-slate-950"
    >
      {/* Cinematic Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-950 to-slate-950 pointer-events-none" />
      
      {/* Stadium Texture Overlay - Original Grass */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grass.png')]" />

      {/* Header Level - Horizontal Guard */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 pt-2">
         <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-5 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/10">
            LIVE ANALYTICS • {time}
         </Badge>
         <div className="flex items-center justify-center gap-4 w-full max-w-[1100px] mx-auto">
            <h2 className={`${getFontSize(team1)} font-black text-white tracking-tighter uppercase drop-shadow-2xl leading-tight flex-1 text-right`}>
               {team1}
            </h2>
            <span className="text-emerald-500 text-xl font-light opacity-50 font-mono tracking-widest shrink-0">VS</span>
            <h2 className={`${getFontSize(team2)} font-black text-white tracking-tighter uppercase drop-shadow-2xl leading-tight flex-1 text-left`}>
               {team2}
            </h2>
         </div>
      </div>

      {/* Primary Metrics Layer - Column Fit */}
      <div className="relative z-10 grid grid-cols-4 gap-4 px-2 w-full max-w-[1150px] mx-auto">
         {/* Proyección Card */}
         <div className="bg-slate-900/40 p-6 rounded-[1.5rem] border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl backdrop-blur-sm">
            <Trophy className="w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
            <div className="w-full">
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 font-mono">PROJEÇÃO (VEREDITO)</p>
               <p className="text-xl font-black text-white leading-tight tracking-tighter flex items-center justify-center gap-2">
                 <Shield className="w-5 h-5 text-sky-400 opacity-80" />
                 {factors.favorite}
               </p>
            </div>
         </div>

         {/* Goals Card */}
         <div className="bg-slate-900/40 p-6 rounded-[1.5rem] border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl backdrop-blur-sm">
            <Target className="w-12 h-12 text-sky-500 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]" />
            <div className="w-full">
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 font-mono">GOLS (90 MINUTOS)</p>
               <p className="text-xl font-black text-white leading-tight tracking-tighter">{factors.goals}</p>
            </div>
         </div>

         {/* Corners Card */}
         <div className="bg-slate-900/40 p-6 rounded-[1.5rem] border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl backdrop-blur-sm">
            <Flag className="w-12 h-12 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            <div className="w-full">
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 font-mono">ESCANTEIOS</p>
               <p className="text-xl font-black text-white leading-tight tracking-tighter">{factors.corners}</p>
            </div>
         </div>

         {/* BTTS Card */}
         <div className="bg-slate-900/40 p-6 rounded-[1.5rem] border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl backdrop-blur-sm">
            <Activity className="w-12 h-12 text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
            <div className="w-full">
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 font-mono">AMBOS MARCAM</p>
               <p className="text-xl font-black text-white leading-tight tracking-tighter">{factors.btts}</p>
            </div>
         </div>
      </div>

      {/* Secondary Metrics Floor */}
      <div className="relative z-10 flex flex-col space-y-6 pb-2">
         <div className="flex flex-wrap justify-center gap-12 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
               <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
               <span className="text-sm font-black text-slate-500 uppercase tracking-[0.1em]">CHUTES (TOTAL):</span>
               <span className="text-sm font-black text-white uppercase">{factors.shots || "MÉDIA 0.0"}</span>
            </div>
            <div className="flex items-center gap-3">
               <Target className="w-5 h-5 text-sky-500 shrink-0" />
               <span className="text-sm font-black text-slate-500 uppercase tracking-[0.1em]">AO ALVO:</span>
               <span className="text-sm font-black text-white uppercase">{factors.on_target || "MÉDIA 0.0"}</span>
            </div>
            <div className="flex items-center gap-3">
               <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
               <span className="text-sm font-black text-slate-500 uppercase tracking-[0.1em]">CARTÕES:</span>
               <span className="text-sm font-black text-white uppercase">{factors.cards}</span>
            </div>
         </div>

         <div className="flex justify-between items-end opacity-60 px-4">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20">S</div>
               <span className="text-[11px] font-black text-white uppercase tracking-widest">SENTINELA SPORTS</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-bold tracking-[0.2em]">QUANTITATIVE DATA SCIENCE ENGINE</span>
         </div>
      </div>

    </motion.div>
  );
};
