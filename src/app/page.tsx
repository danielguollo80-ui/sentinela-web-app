import { BannerGenerator } from "@/components/banner-generator";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060b12] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.14),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_40%_30%_at_80%_80%,rgba(14,165,233,0.06),transparent)] pointer-events-none" />

      <div className="relative pt-6 sm:pt-10 pb-24">
        {/* Header */}
        <div className="container mx-auto px-6 mb-8 flex flex-col items-center text-center gap-4">
          <div className="relative w-20 h-20 rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] border border-emerald-500/20">
            <img 
              src="/logo-premium.png" 
              alt="Sentinela Logo" 
              className="w-full h-full object-cover scale-110"
            />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-white"
                style={{ textShadow: '0 0 40px rgba(255,255,255,0.08)' }}>
              SENTINELA{" "}
              <span className="text-emerald-400" style={{ textShadow: '0 0 30px rgba(52,211,153,0.5)' }}>
                PRO
              </span>
            </h1>
            <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase max-w-[280px] mx-auto">
              Elite Market Analysis &amp; Asset Generation Suite
            </p>
          </div>

          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)] backdrop-blur-xl">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">System Status</span>
              <span className="text-[11px] font-mono text-emerald-400 font-black">ANALYTICS_ONLINE</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="container mx-auto px-8 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        </div>

        {/* Nav shortcuts */}
        <div className="container mx-auto px-8 mb-8 flex gap-3">
          <a
            href="/crypto"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-bold hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-200 transition-all shadow-[0_0_12px_rgba(16,185,129,0.08)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          >
            <span className="text-base">₿</span> Crypto Analyzer
          </a>
        </div>

        <BannerGenerator />
      </div>
    </main>
  );
}
