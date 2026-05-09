import { BannerGenerator } from "@/components/banner-generator";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060b12] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      {/* Background gradients — sutis */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.06),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_40%_30%_at_80%_80%,rgba(14,165,233,0.03),transparent)] pointer-events-none" />

      <div className="relative pt-10 sm:pt-16 pb-24">
        {/* Header */}
        <div className="container mx-auto px-6 mb-10 flex flex-col items-center text-center gap-5">
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-[2rem] overflow-hidden shadow-[0_4px_24px_rgba(16,185,129,0.12)] border border-emerald-500/15 animate-in fade-in zoom-in duration-1000">
            <img
              src="/logo-premium.png"
              alt="Sentinela Logo"
              className="w-full h-full object-cover scale-110"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
              SENTINELA{" "}
              <span className="text-emerald-400">
                PRO
              </span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm font-semibold tracking-[0.2em] uppercase max-w-2xl mx-auto">
              Elite Market Analysis &nbsp;·&nbsp; Swing Trade &nbsp;·&nbsp; IA Claude Sonnet 4.6
            </p>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 backdrop-blur-xl">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-0.5">System Status</span>
              <span className="text-sm font-mono text-emerald-400 font-bold">ANALYTICS_ONLINE</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="container mx-auto px-8 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        </div>

        {/* Nav shortcuts */}
        <div className="container mx-auto px-8 mb-8 flex flex-wrap gap-3">
          <a
            href="/crypto"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 text-emerald-300 text-sm font-bold hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-200 transition-all"
          >
            <span className="text-base">₿</span> Crypto Analyzer
          </a>
          <a
            href="/stocks"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-blue-500/25 bg-blue-500/8 text-blue-300 text-sm font-bold hover:bg-blue-500/15 hover:border-blue-500/40 hover:text-blue-200 transition-all"
          >
            <span className="text-base">📈</span> Stocks Analyzer
          </a>
        </div>

        <BannerGenerator />
      </div>
    </main>
  );
}
