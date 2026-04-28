import Link from "next/link";
import { CryptoAnalyzer } from "@/components/crypto-analyzer";

export const metadata = {
  title: "Crypto Analyzer — Sentinela PRO",
  description: "Análise técnica em tempo real para qualquer par cripto",
};

export default function CryptoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060b12] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent)] pointer-events-none" />

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
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
              SENTINELA <span className="text-emerald-400" style={{ textShadow: "0 0 30px rgba(52,211,153,0.5)" }}>PRO</span>
            </h1>
            <p className="text-slate-300 text-sm font-black tracking-[0.2em] uppercase">
              Análise técnica · Swing Trade · IA Claude
            </p>
          </div>

          <Link
            href="/"
            className="text-xs text-slate-100 hover:text-emerald-400 transition-colors font-black uppercase tracking-widest pt-2"
          >
            ← voltar ao início
          </Link>
        </div>

        <CryptoAnalyzer />
      </div>
    </main>
  );
}
