import { CryptoAnalyzer } from "@/components/crypto-analyzer";

export const metadata = {
  title: "Crypto Analyzer — Sentinela PRO",
  description: "Análise técnica em tempo real para qualquer par cripto",
};

export default function CryptoPage() {
  return (
    <main className="min-h-screen bg-[#060b12] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent)] pointer-events-none" />

      <div className="relative pt-10 pb-24">
        {/* Header */}
        <div className="container mx-auto px-6 mb-8 flex flex-col items-center text-center gap-4 max-w-4xl">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/20">
            <img 
              src="/logo-premium.png" 
              alt="Sentinela Logo" 
              className="w-full h-full object-cover scale-110"
            />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter text-white">
              SENTINELA <span className="text-emerald-400" style={{ textShadow: "0 0 30px rgba(52,211,153,0.4)" }}>PRO</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">
              Análise técnica · Swing Trade · IA Claude
            </p>
          </div>

          <a
            href="/"
            className="text-[10px] text-slate-600 hover:text-emerald-400 transition-colors font-mono uppercase tracking-widest"
          >
            ← voltar ao início
          </a>
        </div>

        <CryptoAnalyzer />
      </div>
    </main>
  );
}
