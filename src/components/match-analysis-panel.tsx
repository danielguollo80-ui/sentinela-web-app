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
    if (len > 25) return "text-2xl";
    if (len > 18) return "text-3xl";
    if (len > 12) return "text-4xl";
    if (len > 8) return "text-5xl";
    return "text-6xl";
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
      icon: <Trophy className="w-10 h-10" />,
      iconColor: 'text-amber-400',
      glowColor: 'rgba(251,191,36,0.25)',
      borderColor: 'border-amber-500/30',
      bgColor: 'from-amber-950/40 to-slate-900/60',
      label: 'PROJECTION (VERDICT)',
      value: factors.favorite,
      extra: <Shield className="w-4 h-4 text-sky-400 shrink-0" />,
    },
    {
      icon: <Target className="w-10 h-10" />,
      iconColor: 'text-sky-400',
      glowColor: 'rgba(56,189,248,0.25)',
      borderColor: 'border-sky-500/30',
      bgColor: 'from-sky-950/40 to-slate-900/60',
      label: 'GOALS (90 MINUTES)',
      value: factors.goals,
    },
    {
      icon: <Flag className="w-10 h-10" />,
      iconColor: 'text-emerald-400',
      glowColor: 'rgba(52,211,153,0.25)',
      borderColor: 'border-emerald-500/30',
      bgColor: 'from-emerald-950/40 to-slate-900/60',
      label: 'CORNERS',
      value: factors.corners,
    },
    {
      icon: <Activity className="w-10 h-10" />,
      iconColor: 'text-purple-400',
      glowColor: 'rgba(192,132,252,0.25)',
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
      className="w-full h-full relative overflow-hidden flex flex-col justify-between px-10 py-8 bg-[#060b12]"
    >
      {/* ── Deep Background ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.12),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(16,185,129,0.06),transparent)] pointer-events-none" />

      {/* Pitch lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-400" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-emerald-400" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-400" />
      </div>

      {/* Noise grain */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* ── HEADER ── */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Live badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[11px] font-black text-emerald-400 tracking-[0.25em] uppercase">Live Analytics • {time}</span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-6 w-full max-w-[1100px] mx-auto mt-1">
          <motion.h2
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className={`${getFontSize(team1)} font-black tracking-tighter uppercase leading-none flex-1 text-right`}
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.15)' }}
          >
            <span className="text-white">{team1}</span>
          </motion.h2>

          {/* VS divider */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-emerald-500/60 to-transparent" />
            <div className="w-10 h-10 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <span className="text-[11px] font-black text-emerald-400 tracking-wider">VS</span>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-emerald-500/60 to-transparent" />
          </div>

          <motion.h2
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className={`${getFontSize(team2)} font-black tracking-tighter uppercase leading-none flex-1 text-left`}
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.15)' }}
          >
            <span className="text-white">{team2}</span>
          </motion.h2>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="relative z-10 grid grid-cols-4 gap-4 w-full max-w-[1150px] mx-auto">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.2 }}
            className={`relative rounded-2xl border ${card.borderColor} bg-gradient-to-b ${card.bgColor} backdrop-blur-sm p-5 flex flex-col items-center justify-center text-center gap-3 overflow-hidden`}
            style={{ boxShadow: `0 4px 30px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)` }}
          >
            {/* Top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.glowColor.replace('0.25','0.8')}, transparent)` }} />

            <div className={card.iconColor} style={{ filter: `drop-shadow(0 0 10px ${card.glowColor})` }}>
              {card.icon}
            </div>

            <div className="w-full space-y-1.5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] font-mono">{card.label}</p>
              <p className={`text-lg font-black leading-tight tracking-tight ${valueColor(card.value)} flex items-center justify-center gap-1.5 flex-wrap`}>
                {card.extra}
                {card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── SECONDARY METRICS ── */}
      <div className="relative z-10 flex flex-col gap-4 pb-1">
        <div className="flex flex-wrap justify-center items-center gap-8 py-4 border-t border-slate-800/60">
          {[
            { icon: <Target className="w-4 h-4 text-sky-400 shrink-0" />, label: 'SHOTS ON TARGET', value: factors.on_target },
            { icon: <Flag className="w-4 h-4 text-emerald-400 shrink-0" />, label: 'CORNERS', value: factors.corners },
            { icon: <Zap className="w-4 h-4 text-purple-400 shrink-0" />, label: 'BTTS', value: factors.btts },
            { icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />, label: 'CARDS', value: factors.cards },
            { icon: <TrendingUp className="w-4 h-4 text-rose-400 shrink-0" />, label: 'HT GOALS', value: factors.ht_goals },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              {m.icon}
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">{m.label}:</span>
              <span className={`text-[11px] font-black uppercase ${valueColor(m.value)}`}>{m.value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <span className="text-[11px] font-black text-slate-950">S</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Sentinela Sports</span>
              <span className="text-[9px] font-mono text-slate-500 tracking-widest">ELITE ANALYTICS ENGINE</span>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 tracking-[0.25em] uppercase">Quantitative · Data Science</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
