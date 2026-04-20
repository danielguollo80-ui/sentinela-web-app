import { BannerGenerator } from "@/components/banner-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-sky-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      
      <div className="relative pt-12 pb-24">
         <div className="container mx-auto px-8 mb-12 flex items-center justify-between">
            <div className="space-y-1">
               <h1 className="text-4xl font-black tracking-tighter text-white lg:text-5xl">
                  SENTINELA <span className="text-sky-500">PRO</span>
               </h1>
               <p className="text-slate-500 font-medium tracking-tight whitespace-nowrap overflow-hidden">
                  ELITE MARKET ANALYSIS & ASSET GENERATION SUITE
               </p>
            </div>
            <div className="flex gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">System Status</span>
                  <span className="text-xs font-mono text-emerald-400">● ANALYTICS_ONLINE</span>
               </div>
            </div>
         </div>

         <BannerGenerator />
      </div>
    </main>
  );
}
