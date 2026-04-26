import { BannerGenerator } from "@/components/banner-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#060b12] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      <div className="relative pt-10 pb-24">
        {/* Header */}
        <div className="container mx-auto px-8 mb-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <span className="text-sm font-black text-slate-950">S</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white lg:text-5xl">
                SENTINELA <span className="text-emerald-400" style={{ textShadow: '0 0 30px rgba(52,211,153,0.4)' }}>PRO</span>
              </h1>
            </div>
            <p className="text-slate-600 text-xs font-bold tracking-[0.25em] uppercase pl-12">
              Elite Market Analysis & Asset Generation Suite
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">System Status</span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">ANALYTICS_ONLINE</span>
            </div>
          </div>
        </div>

        {/* Nav shortcuts */}
        <div className="container mx-auto px-8 mb-8 flex gap-3">
          <a
            href="/crypto"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-sm font-bold hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all"
          >
            <span className="text-base">₿</span> Crypto Analyzer
          </a>
        </div>

        <BannerGenerator />
      </div>
    </main>
  );
}
