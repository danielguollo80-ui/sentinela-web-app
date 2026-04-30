import Link from "next/link";
import { StocksGrid } from "@/components/stocks-grid";

export const metadata = {
  title: "Stocks Analyzer — Sentinela PRO",
  description: "Análise quantitativa de ações americanas (NYSE/NASDAQ)",
};

export default function StocksPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060b12] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(52,211,153,0.08),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_40%_30%_at_80%_80%,rgba(14,165,233,0.03),transparent)] pointer-events-none" />

      <div className="relative pt-10 pb-24">
        {/* Header */}
        <div className="container mx-auto px-6 mb-8 flex flex-col items-center text-center gap-4 max-w-4xl">
          <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] border border-emerald-500/20">
            <img 
              src="/logo-premium.png" 
              alt="Sentinela Logo" 
              className="w-full h-full object-cover scale-110"
            />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
              SENTINELA <span className="text-emerald-400" style={{ textShadow: "0 0 30px rgba(52,211,153,0.5)" }}>STOCKS</span>
            </h1>
            <p className="text-slate-300 text-sm font-black tracking-[0.2em] uppercase">
              Mercado Americano · NYSE/NASDAQ · IA Claude 3.5
            </p>
          </div>

          <Link
            href="/"
            className="text-xs text-slate-100 hover:text-emerald-400 transition-colors font-black uppercase tracking-widest pt-2"
          >
            ← voltar ao início
          </Link>
        </div>

        <div className="container mx-auto px-4 max-w-6xl">
          <StocksGrid />
        </div>
      </div>
    </main>
  );
}
