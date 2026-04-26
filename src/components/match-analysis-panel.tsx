"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Flag, Activity, AlertCircle, Zap, Shield, TrendingUp } from 'lucide-react';

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

export const MatchAnalysisPanel: React.FC<MatchAnalysisPanelProps> = ({ match, time, factors }) => {
  const teams = match.split(' vs ');
  const team1 = teams[0] || "Time 1";
  const team2 = teams[1] || "Time 2";

  const getFontSize = (name: string) => {
    const len = name.length;
    if (len > 25) return "text-xl";
    if (len > 18) return "text-2xl";
    if (len > 12) return "text-3xl";
    if (len > 8) return "text-4xl";
    return "text-5xl";
  };

  const isOver = (val: string) => val?.toUpperCase().includes('OVER');
  const isYes  = (val: string) => val?.toUpperCase().startsWith('YES');
  const isHigh = (val: string) => val?.toUpperCase().includes('HIGH') || val?.toUpperCase().includes('HIGH PRESSURE');

  const valueColor = (val: string) => {
    if (isYes(val))  return 'text-emerald-400';
    if (isOver(val)) return 'text-sky-400';
    if (val?.toUpperCase().includes('NO')) return 'text-rose-400';
    if (isHigh(val)) return 'text-amber-400';
    return 'text-white';
  };

  const cards = [
    {
      icon: <Trophy className="w-8 h-8" />,
      iconColor: 'text-amber-400',
      glowColor: 'rgba(251,191,36,0.2)',
      borderColor: 'border-amber-500/30',
      bgColor: 'from-amber-950/40 to-slate-900/60',
      label: 'PROJECTION (VERDICT)',
      value: factors.favorite,
      extra: <Shield className="w-4 h-4 text-sky-400 shrink-0" />,
    },
    {
      icon: <Target className="w-8 h-8" />,
      iconColor: 'text-sky-400',
      glowColor: 'rgba(56,189,248,0.2)',
      borderColor: 'border-sky-500/30',
      bgColor: 'from-sky-950/40 to-slate-900/60',
      label: 'GOALS (90 MINUTES)',
      value: factors.goals,
    },
    {
      icon: <Flag className="w-7 h-7" />,
      iconColor: 'text-emerald-400',
      glowColor: 'rgba(52,211,153,0.2)',
      borderColor: 'border-emerald-500/30',
      bgColor: 'from-emerald-950/40 to-slate-900/60',
      label: 'CORNERS',
      value: factors.corners,
    },
    {
      icon: <Activity className="w-7 h-7" />,
      iconColor: 'text-purple-400',
      glowColor: 'rgba(192,132,252,0.2)',
      borderColor: 'border-purple-500/30',
      bgColor: 'from-purple-950/40 to-slate-900/60',
      label: 'BTTS',
      value: factors.btts,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full h-full relative overflow-hidden flex flex-col justify-between px-8 py-5 bg-[#060b12] rounded-t-[2.5rem]"
    >
      {/* ── Deep Background ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(14,165,233,0.1),transparent)] pointer-events-none" />

      {/* ── HEADER ── */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        {/* Live badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-sentinela-blue/30 bg-sentinela-blue/10 glow-blue">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinela-blue opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sentinela-blue" />
          </span>
          <span className="text-[10px] font-black text-sentinela-blue tracking-[0.2em] uppercase text-glow">Live Analytics • {time}</span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-4 w-full max-w-[1000px] mx-auto">
          <motion.h2
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className={`${getFontSize(team1)} font-black tracking-tighter uppercase leading-none flex-1 text-right text-white text-glow`}
          >
            {team1}
          </motion.h2>

          {/* VS divider */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border border-sentinela-blue/40 bg-sentinela-blue/10 flex items-center justify-center glow-blue">
              <span className="text-[10px] font-black text-sentinela-blue italic">VS</span>
            </div>
          </div>

          <motion.h2
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className={`${getFontSize(team2)} font-black tracking-tighter uppercase leading-none flex-1 text-left text-white text-glow`}
          >
            {team2}
          </motion.h2>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="relative z-10 grid grid-cols-4 gap-4 w-full max-w-[1100px] mx-auto mt-2">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.2 }}
            className={`relative rounded-xl border ${card.borderColor} bg-slate-900/40 backdrop-blur-md p-4 flex flex-col items-center justify-center text-center gap-2.5 overflow-hidden group hover:bg-slate-800/60 transition-colors`}
            style={{ boxShadow: `0 4px 20px ${card.glowColor}` }}
          >
            <div className={`${card.iconColor} transition-transform group-hover:scale-110 duration-300`}>
              {card.icon}
            </div>

            <div className="w-full space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] font-mono">{card.label}</p>
              <p className={`text-lg font-black leading-tight tracking-tight ${valueColor(card.value)} flex items-center justify-center gap-1.5 flex-wrap text-glow`}>
                {card.extra}
                {card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── SECONDARY METRICS ── */}
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex flex-wrap justify-center items-center gap-6 py-3 border-t border-white/5 bg-white/[0.01] backdrop-blur-sm rounded-lg">
          {[
            { icon: <Target className="w-3.5 h-3.5 text-sentinela-blue shrink-0" />, label: 'SHOTS ON TARGET', value: factors.on_target },
            { icon: <Flag className="w-3.5 h-3.5 text-sentinela-emerald shrink-0" />, label: 'CORNERS', value: factors.corners },
            { icon: <Zap className="w-3.5 h-3.5 text-sentinela-purple shrink-0" />, label: 'BTTS', value: factors.btts },
            { icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />, label: 'CARDS', value: factors.cards },
            { icon: <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />, label: 'HT GOALS', value: factors.ht_goals },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors">
              {m.icon}
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em]">{m.label}:</span>
              <span className={`text-[10px] font-black uppercase ${valueColor(m.value)} text-glow`}>{m.value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-1 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sentinela-blue flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              <span className="text-xs font-black text-white">S</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white uppercase tracking-[0.2em] text-glow">Sentinela Sports</span>
              <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">Elite Analysis Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-70">
            <div className="w-1.5 h-1.5 rounded-full bg-sentinela-blue animate-pulse" />
            <span className="text-[10px] font-mono text-sentinela-blue tracking-[0.25em] uppercase text-glow">Quantitative · Data Science</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
