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
        <div className="container mx-auto px-8 mb-8 flex items-center justify-between max-w-4xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <span className="text-sm font-black text-slate-950">S</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-white lg:text-4xl">
                SENTINELA <span className="text-emerald-400" style={{ textShadow: "0 0 30px rgba(52,211,153,0.4)" }}>CRYPTO</span>
              </h1>
            </div>
            <p className="text-slate-600 text-xs font-bold tracking-[0.25em] uppercase pl-12">
              Análise técnica · Swing Trade · IA Claude
            </p>
          </div>

          <a
            href="/"
            className="text-xs text-slate-500 hover:text-emerald-400 transition-colors font-mono"
          >
            ← voltar
          </a>
        </div>

        <CryptoAnalyzer />
      </div>
    </main>
  );
}
