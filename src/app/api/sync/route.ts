import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenParams = searchParams.get('token');
    const botType = searchParams.get('bot') || 'crypto';

    const AUTH_TOKEN = (process.env.SYNC_AUTH_TOKEN || '').trim();

    if (!AUTH_TOKEN || tokenParams !== AUTH_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    const url = process.env.REDIS_URL || '';
    const kv = url ? new Redis(url) : null;

    if (kv) {
      await kv.set(`sentinela:${botType}`, JSON.stringify(data));
      await kv.quit();
    }

    return NextResponse.json({ success: true, bot: botType });
  } catch (error) {
    console.error('POST Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync data' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const botType = searchParams.get('bot') || 'crypto';

    const url = process.env.REDIS_URL || '';
    const kv = url ? new Redis(url) : null;

    let fullData: Record<string, unknown> | null = null;

    // Local files take priority when running on the same machine as the bots
    const LOCAL_PATHS: Record<string, string> = {
      football: path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Futebol', 'latest_results_football.json'),
      stocks:   path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Acoes', 'latest_results_stocks.json'),
    };
    if (botType in LOCAL_PATHS && fs.existsSync(LOCAL_PATHS[botType])) {
      try {
        fullData = JSON.parse(fs.readFileSync(LOCAL_PATHS[botType], 'utf8'));
      } catch (_e) { /* ignora parse error, tenta Redis */ }
    }

    // Redis fallback (Vercel production or local files not available)
    if (!fullData && kv) {
      try {
        const raw = await kv.get(`sentinela:${botType}`);
        if (raw) {
            fullData = JSON.parse(raw);
        }
      } catch (_e) {
        console.warn('KV not available.');
      }
    }
    if (kv) { try { await kv.quit(); } catch (_e) {} }

    // Crypto local fallback
    if (!fullData && botType === 'crypto') {
      const DATA_DIR = path.join(process.cwd(), 'data');
      const SYNC_FILE = path.join(DATA_DIR, 'bot_sync.json');
      if (fs.existsSync(SYNC_FILE)) fullData = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
    }

    // Stocks real-time fallback (runs before fullData null check)
    if (botType === 'stocks' && symbol) {
      const sym = symbol.toUpperCase();
      // Helper: busca pré-market via Yahoo Finance quote API
      const fetchPreMarket = async (ticker: string) => {
        try {
          const h = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
          const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}&fields=preMarketPrice,preMarketChange,preMarketChangePercent`, { headers: h, next: { revalidate: 0 } });
          if (!r.ok) return null;
          const j = await r.json();
          const q = j?.quoteResponse?.result?.[0];
          if (!q?.preMarketPrice) return null;
          return { preMarketPrice: q.preMarketPrice as number, preMarketChange: q.preMarketChange as number, preMarketChangePercent: q.preMarketChangePercent as number };
        } catch { return null; }
      };

      // Return cached data + inject pre-market live
      if (fullData?.[sym]) {
        const pm = await fetchPreMarket(sym);
        const cached = { ...fullData[sym], ...(pm ?? {}) };
        return NextResponse.json({ analysis: cached });
      }
      // Real-time analysis via Yahoo Finance
      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        };
        const yahooRes = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y`,
          { headers, next: { revalidate: 0 } }
        );
        if (!yahooRes.ok) {
          return NextResponse.json({ error: `Ação "${sym}" não encontrada.` }, { status: 404 });
        }
        const yahooJson = await yahooRes.json();
        const chartResult = yahooJson.chart?.result?.[0];
        if (!chartResult) {
          return NextResponse.json({ error: `Ação "${sym}" não encontrada.` }, { status: 404 });
        }
        const meta = chartResult.meta;
        const quotes = chartResult.indicators?.quote?.[0] || {};
        const closes = ((quotes.close || []) as (number | null)[]).filter((c): c is number => c != null);
        const highs  = ((quotes.high  || []) as (number | null)[]).filter((h): h is number => h != null);
        const lows   = ((quotes.low   || []) as (number | null)[]).filter((l): l is number => l != null);
        if (closes.length < 20) {
          return NextResponse.json({ error: `Dados insuficientes para "${sym}".` }, { status: 404 });
        }
        const price = (meta.regularMarketPrice as number) || closes[closes.length - 1];
        const { calculateRSI, calculateMACD, calculateEMA, calculateATR, calculateBB, calculateADX } = await import('@/lib/indicators');
        const rsi     = calculateRSI(closes, 14);
        const macd    = calculateMACD(closes);
        const ema200  = calculateEMA(closes, 200).pop() ?? 0;
        const ema50   = calculateEMA(closes, 50).pop()  ?? 0;
        const ema21   = calculateEMA(closes, 21).pop()  ?? 0;
        const atr     = calculateATR(highs, lows, closes, 14).pop() ?? 0;
        const bb      = calculateBB(closes);
        const adxData = calculateADX(highs, lows, closes, 14);
        const trend   = price > ema200 ? "Bullish" : "Bearish";
        let emaPos = "NEUTRO";
        if (price > ema21 && ema21 > ema50 && ema50 > ema200) emaPos = "BULLISH FORTE";
        else if (price > ema200) emaPos = "BULLISH";
        else if (price < ema21 && ema21 < ema50 && ema50 < ema200) emaPos = "BEARISH FORTE";
        else if (price < ema200) emaPos = "BEARISH";
        // Pivot points for S/R
        const prevH = highs[highs.length - 2] || price;
        const prevL = lows[lows.length - 2]  || price;
        const prevC = closes[closes.length - 2] || price;
        const pp = (prevH + prevL + prevC) / 3;
        const r1 = (2 * pp) - prevL;
        const s1 = (2 * pp) - prevH;
        const r2 = pp + (prevH - prevL);
        const s2 = pp - (prevH - prevL);
        const realtimeData: Record<string, unknown> = {
          symbol: sym,
          price,
          rsi,
          trend,
          supports:    [s1, s2].sort((a, b) => b - a),
          resistances: [r1, r2].sort((a, b) => a - b),
          indicators_1d: {
            rsi, macd_cross: macd.cross, macd_above_zero: macd.aboveZero,
            bb_position: bb.position, bb_upper: bb.upper, bb_lower: bb.lower,
            ema_position: emaPos, ema21, ema50, ema200,
            adx: adxData.adx, atr,
          },
          ai_analysis: `[Yahoo Finance] Analisando ${sym}...`,
          timestamp: Date.now() / 1000,
          last_update: new Date().toISOString()
        };
        // Pré-market em paralelo
        const pm = await fetchPreMarket(sym);
        if (pm) Object.assign(realtimeData, pm);
        // AI Analysis
        try {
          const Anthropic = (await import('@anthropic-ai/sdk')).default;
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const msg = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 350,
            messages: [{
              role: "user",
              content: `Analise a ação ${sym} (NYSE/NASDAQ, dados Yahoo Finance):\n- Preço: $${price.toFixed(2)}\n- RSI: ${rsi.toFixed(2)}\n- Tendência EMA: ${emaPos}\n- ADX: ${adxData.adx.toFixed(2)}\n- MACD: ${macd.cross}\n- BB: ${bb.position}\n- ATR: $${atr.toFixed(2)}\n\nFormato obrigatório:\nSYMBOL: ${sym}\nVEREDITO: [emoji] [COMPRA/VENDA/NEUTRO]\nSCORE: [X/10]\nTÉCNICO: [1 linha]\nSETUP: Entrada $X | Stop $X | Alvo $X | R/R X:1\nRISCO: [1 linha]`
            }]
          });
          if (msg.content[0].type === 'text') realtimeData.ai_analysis = msg.content[0].text;
        } catch (_aiErr) {
          realtimeData.ai_analysis = `SYMBOL: ${sym}\nVEREDITO: ${trend === 'Bullish' ? '🟢 COMPRA' : '🔴 VENDA'}\nSCORE: N/A\nTÉCNICO: RSI ${rsi.toFixed(2)} | ${emaPos}\nSETUP: N/A\nRISCO: Análise IA indisponível`;
        }
        return NextResponse.json({ analysis: realtimeData });
      } catch (err) {
        console.error('Stocks real-time error:', err);
        return NextResponse.json({ error: `Erro ao analisar "${sym}".` }, { status: 500 });
      }
    }

    if (!fullData) {
      return NextResponse.json({ error: 'No data available.' }, { status: 404 });
    }

    if (botType === 'football') {
      const selectedMatch = symbol || Object.keys(fullData)[0];
      const matchData = fullData[selectedMatch];
      return NextResponse.json({ match: matchData, allMatches: Object.keys(fullData) });
    }

    if (botType === 'crypto') {
      // Suporta ambos os formatos: "BTC" e "BTC/USDT"
      const resolveSymbol = (sym: string | null): string => {
        if (!sym) return Object.keys(fullData)[0] || "BTC/USDT";
        if (fullData[sym]) return sym;
        const withUsdt = sym.includes('/') ? sym : `${sym}/USDT`;
        if (fullData[withUsdt]) return withUsdt;
        const short = sym.split('/')[0].toUpperCase();
        if (fullData[short]) return short;
        // Se não achou no cache, retorna o próprio símbolo para tentar o Live Fallback
        return sym.toUpperCase().includes('USDT') ? sym.toUpperCase() : `${sym.toUpperCase()}/USDT`;
      };
      const selectedSymbol = resolveSymbol(symbol);
      const symbolData = fullData[selectedSymbol] as Record<string, unknown>;

      if (!symbolData) {
        // MULTI-EXCHANGE REAL-TIME FALLBACK
        try {
          const cleanSymbol = selectedSymbol.replace('/', '').replace(':USDT', '').toUpperCase();
          const pair = cleanSymbol.endsWith('USDT') ? cleanSymbol : cleanSymbol + 'USDT';
          const cleanBase = cleanSymbol.replace('USDT', '');
          
          let klines: unknown[][] = [];
          let source = "Bybit";
          const headers = { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          };

          // REAL-TIME ANALYZER
          const isDayTrade = (botType as string) === 'day_trade';
          const interval = isDayTrade ? '120' : '240';
          const timeframeLabel = isDayTrade ? '2H' : '4H';

          // 1. TRY BYBIT LINEAR (Futures)
          try {
            const res = await fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=${interval}&limit=500`, { headers, next: { revalidate: 0 } });
            if (res.ok) {
              const json = await res.json();
              if (json.retCode === 0 && json.result?.list?.length > 0) {
                klines = json.result.list.reverse();
                source = `Bybit Linear (${timeframeLabel})`;
              }
            }
          } catch(_e) {}

          // 2. TRY BYBIT SPOT (Fallback for smaller coins)
          if (klines.length === 0) {
            try {
              const res = await fetch(`https://api.bytick.com/v5/market/kline?category=spot&symbol=${pair}&interval=${interval}&limit=500`, { headers, next: { revalidate: 0 } });
              if (res.ok) {
                const json = await res.json();
                if (json.retCode === 0 && json.result?.list?.length > 0) {
                  klines = json.result.list.reverse();
                  source = `Bybit Spot (${timeframeLabel})`;
                }
              }
            } catch(_e) {}
          }

          // 3. TRY CRYPTOCOMPARE (Ultimate Global Fallback)
          if (klines.length === 0) {
            try {
              const ccBase = cleanBase.replace('USDT', '');
              const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${ccBase}&tsym=USDT&limit=1000&aggregate=4`, { headers, next: { revalidate: 0 } });
              if (res.ok) {
                const json = await res.json();
                if (json.Response === "Success" && json.Data?.Data?.length > 0) {
                  klines = json.Data.Data.map((d: Record<string, unknown>) => [
                    (d.time as number) * 1000, d.open, d.high, d.low, d.close, d.volumeto
                  ]);
                  source = "CryptoCompare (1H)";
                }
              }
            } catch(_e) {}
          }

          if (klines.length === 0) {
            return NextResponse.json({ error: `Moeda "${cleanSymbol}" não encontrada.` }, { status: 404 });
          }

          const highs = klines.map((k: unknown[]) => parseFloat(k[2] as string));
          const lows = klines.map((k: unknown[]) => parseFloat(k[3] as string));
          const closes = klines.map((k: unknown[]) => parseFloat(k[4] as string));
          const volumes = klines.map((k: unknown[]) => parseFloat(k[5] as string));
          const price = closes[closes.length - 1];
          
          const {
            calculateRSI, calculateMACD, calculateBB, calculateEMA,
            calculateADX, calculateATR
          } = await import('@/lib/indicators');
          const rsi = calculateRSI(closes, 14);
          const macd = calculateMACD(closes);
          const bb = calculateBB(closes);
          const adxData = calculateADX(highs, lows, closes, 14);
          const atr = calculateATR(highs, lows, closes, 14).pop() ?? 0;
          const ema21 = calculateEMA(closes, 21).pop() ?? 0;
          const ema50 = calculateEMA(closes, 50).pop() ?? 0;
          const ema200 = calculateEMA(closes, 200).pop() ?? 0;
          const poc = bb.upper - (bb.upper - bb.lower) / 2;
          
          // Tactical calculations
          const squeeze = bb.width < 0.05 ? "SQUEEZE" : "EXPANSÃO";

          let emaPos = "NEUTRO";
          if (price > ema21 && ema21 > ema50 && ema50 > ema200) emaPos = "BULLISH FORTE";
          else if (price > ema200) emaPos = "BULLISH";
          else if (price < ema21 && ema21 < ema50 && ema50 < ema200) emaPos = "BEARISH FORTE";
          else if (price < ema200) emaPos = "BEARISH";

          const prevH = highs[highs.length - 2] || price;
          const prevL = lows[lows.length - 2] || price;
          const prevC = closes[closes.length - 2] || price;
          const pp = (prevH + prevL + prevC) / 3;
          const r1 = (2 * pp) - prevL;
          const s1 = (2 * pp) - prevH;
          const r2 = pp + (prevH - prevL);
          const s2 = pp - (prevH - prevL);
          const r3 = r1 + (prevH - prevL);
          const s3 = s1 - (prevH - prevL);

          const realTimeData = {
            symbol: selectedSymbol,
            price: price,
            poc: poc,
            supports: [s1, s2, s3].sort((a, b) => b - a), // Descending
            resistances: [r1, r2, r3].sort((a, b) => a - b), // Ascending
            indicators_1d: {
              rsi, macd_cross: macd.cross, macd_above_zero: macd.aboveZero,
              bb_position: bb.position, bb_upper: bb.upper, bb_lower: bb.lower,
              ema_position: emaPos, ema21, ema50, ema200,
              adx: adxData.adx, atr: atr, poc_pivot: poc,
              plus_di: (adxData.plusDI + adxData.minusDI) === 0 ? 0 : (adxData.plusDI / (adxData.plusDI + adxData.minusDI)) * 100,
              minus_di: (adxData.plusDI + adxData.minusDI) === 0 ? 0 : (adxData.minusDI / (adxData.plusDI + adxData.minusDI)) * 100
            },
            indicators_4h: {
              rsi: rsi,
              macd_cross: macd.cross,
              adx: adxData.adx,
              adx_label: adxData.adx > 25 ? 'FORTE' : adxData.adx > 20 ? 'FRACO' : 'SIDEWAYS',
              plus_di: (adxData.plusDI + adxData.minusDI) === 0 ? 0 : Math.round((adxData.plusDI / (adxData.plusDI + adxData.minusDI)) * 1000) / 10,
              minus_di: (adxData.plusDI + adxData.minusDI) === 0 ? 0 : Math.round((adxData.minusDI / (adxData.plusDI + adxData.minusDI)) * 1000) / 10,
              vmc_dot: rsi > 70 ? "RED" : rsi < 30 ? "GREEN" : "NEUTRAL",
              wt1: macd.aboveZero ? 10 : -10,
              wt_dir: emaPos.includes("BULLISH") ? "UPWARD" : "DOWNWARD",
              bb_width_label: squeeze
            },
            history: klines.map((k: unknown[]) => ({
              time: parseInt(k[0] as string) / 1000,
              open: parseFloat(k[1] as string), high: parseFloat(k[2] as string),
              low: parseFloat(k[3] as string),  close: parseFloat(k[4] as string)
            })),
            fng: 50,
            fng_label: "Neutral",
            ai_analysis: `[Fonte: ${source}] Analisando tendências para ${selectedSymbol}...`
          };

          // AI ANALYSIS
          try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const anthropic = new Anthropic({
              apiKey: process.env.ANTHROPIC_API_KEY
            });

            const prompt = `Analise a criptomoeda ${selectedSymbol} (Timeframe: ${timeframeLabel} - Fonte: ${source}):
            - Preço Atual: $${price}
            - RSI (${timeframeLabel}): ${rsi.toFixed(2)}
            - Tendência EMA: ${emaPos}
            - Força da Tendência (ADX): ${adxData.adx.toFixed(2)}
            - POC (Pivot): $${poc.toFixed(6)}
            - Direcional: DI+ (${adxData.plusDI.toFixed(2)}) / DI- (${adxData.minusDI.toFixed(2)})
            
            Matemática de análise: ${isDayTrade ? 'DAY TRADE (Curto Prazo - 2H/30M)' : 'SWING TRADE (Médio Prazo - 4H/1D)'}.
            
            Forneça um relatório estratégico em Português (Brasil).
            Diga se é hora de COMPRA, VENDA ou AGUARDAR.
            Seja direto e use o estilo "Sentinela Crypto".`;

            const msg = await anthropic.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1000,
              messages: [{ role: "user", content: prompt }]
            });

            if (msg.content[0].type === 'text') {
              realTimeData.ai_analysis = msg.content[0].text;
            }
          } catch (_aiErr) {
            realTimeData.ai_analysis = `[Fonte: ${source}] Análise concluída. RSI: ${rsi.toFixed(2)}. Tendência: ${emaPos}. POC: $${poc.toFixed(6)}.`;
          }
          // Fetch 1H + 15M para aba SCALP (fallback path)
          try {
            type Candle = { time: number; open: number; high: number; low: number; close: number; volumeto: number };
            const calcDT = (candles: Candle[]) => {
              if (candles.length < 30) return {};
              const closes = candles.map(c => c.close);
              const highs  = candles.map(c => c.high);
              const lows   = candles.map(c => c.low);
              const vols   = candles.map(c => c.volumeto ?? 0);
              const p = closes[closes.length - 1];
              let g = 0, l = 0;
              for (let i = 1; i <= 14; i++) { const d = closes[i]-closes[i-1]; d >= 0 ? g += d : l -= d; }
              let ag = g/14, al = l/14;
              for (let i = 15; i < closes.length; i++) { const d = closes[i]-closes[i-1]; ag=(ag*13+(d>0?d:0))/14; al=(al*13+(d<0?-d:0))/14; }
              const rsi = al===0?100:Math.round((100-100/(1+ag/al))*10)/10;
              const ema = (data: number[], period: number) => { const k=2/(period+1); let e=data[0]; for(let i=1;i<data.length;i++) e=data[i]*k+e*(1-k); return e; };
              const m = closes.map((_,i,a) => ema(a.slice(0,i+1),12)-ema(a.slice(0,i+1),26));
              const macdVal=m[m.length-1]; const sigVal=ema(m.slice(-50),9);
              const macd_cross = macdVal>sigVal?'ALTA (BULLISH)':'BAIXA (BEARISH)';
              let pdm=0,mdm=0,tr14=0;
              for (let i=Math.max(1,highs.length-14);i<highs.length;i++) {
                const up=highs[i]-highs[i-1],dn=lows[i-1]-lows[i];
                pdm+=up>dn&&up>0?up:0; mdm+=dn>up&&dn>0?dn:0;
                tr14+=Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1]));
              }
              const plus_di=tr14>0?Math.round(pdm/tr14*1000)/10:0;
              const minus_di=tr14>0?Math.round(mdm/tr14*1000)/10:0;
              const adx=Math.round(Math.abs(plus_di-minus_di)/Math.max(plus_di+minus_di,0.01)*1000)/10;
              const sl=closes.slice(-20); const mean=sl.reduce((a,b)=>a+b,0)/sl.length;
              const sd=Math.sqrt(sl.reduce((a,b)=>a+Math.pow(b-mean,2),0)/sl.length);
              const bbu=mean+2*sd,bbl=mean-2*sd;
              const bb_position=p>=bbu?'SUPERIOR':p<=bbl?'INFERIOR':p>mean?'MEIO-SUPERIOR':'MEIO-INFERIOR';
              const ema21=Math.round(ema(closes,21)*10000)/10000;
              const ema50=Math.round(ema(closes,50)*10000)/10000;
              const ema_position=p>ema21&&p>ema50?'BULLISH':p<ema21&&p<ema50?'BEARISH':'NEUTRO';
              const vol20=vols.slice(-20).reduce((a,b)=>a+b,0)/20;
              const volume_ratio=Math.round((vol20>0?vols[vols.length-1]/vol20:1)*10)/10;
              return { rsi, macd_cross, macd_above_zero: macdVal>0, adx, adx_label: adx>25?'FORTE':adx>20?'FRACO':'SIDEWAYS', plus_di, minus_di, bb_position, bb_upper: Math.round(bbu*10000)/10000, bb_lower: Math.round(bbl*10000)/10000, ema21, ema50, ema_position, volume_ratio };
            };
            const [r1d, r1h, r15m] = await Promise.all([
              fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${cleanBase}&tsym=USDT&limit=200`, { next: { revalidate: 0 } }),
              fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${cleanBase}&tsym=USDT&limit=100`, { next: { revalidate: 0 } }),
              fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${cleanBase}&tsym=USDT&limit=100&aggregate=15`, { next: { revalidate: 0 } })
            ]);
            if (r1d.ok)  { const j=await r1d.json();  if (j.Response==="Success"&&j.Data?.Data?.length>=30) (realTimeData as Record<string,unknown>).indicators_1d  = calcDT(j.Data.Data); }
            if (r1h.ok)  { const j=await r1h.json();  if (j.Response==="Success"&&j.Data?.Data?.length>=30) (realTimeData as Record<string,unknown>).indicators_1h  = calcDT(j.Data.Data); }
            if (r15m.ok) { const j=await r15m.json(); if (j.Response==="Success"&&j.Data?.Data?.length>=30) (realTimeData as Record<string,unknown>).indicators_15m = calcDT(j.Data.Data); }
          } catch(_e) {}

          return NextResponse.json({
            analysis: realTimeData,
            match: realTimeData,
            history: realTimeData.history,
            allSymbols: Object.keys(fullData),
            allMatches: Object.keys(fullData).map(s => s.includes('/') ? s : `${s}/USDT`)
          });
        } catch (err) {
          console.error('Real-time fallback error:', err);
          return NextResponse.json({ error: 'Erro ao processar análise em tempo real.' }, { status: 500 });
        }
      }

      // Chart history: always fetch daily candles (1 year) for better visual context.
      // histohour+aggregate=4 is capped at 2000 hourly points = only 83 days.
      // histoday gives full 365 daily candles regardless of bot cache size.
      let history: unknown[] = [];
      try {
        const cleanSymbol = ((symbolData.symbol as string) || selectedSymbol).replace('/', '').replace(':USDT', '').toUpperCase();
        const cleanBase = cleanSymbol.replace('USDT', '');
        const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${cleanBase}&tsym=USDT&limit=365`, { next: { revalidate: 0 } });
        if (res.ok) {
          const json = await res.json();
          if (json.Response === "Success" && json.Data?.Data) {
            history = json.Data.Data.map((d: Record<string, unknown>) => ({
              time: d.time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close
            }));
          }
        }
      } catch(_e) {}
      // Fallback to bot cache if daily fetch failed
      if (history.length === 0) history = (symbolData.history as unknown[]) || [];

      const cleanBase = (((symbolData.symbol as string) || selectedSymbol)).replace('/', '').replace('USDT', '').replace(':USDT', '').toUpperCase();

      // Live Price Override for Cached Symbols
      try {
        const priceRes = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${cleanBase}&tsyms=USDT`, { next: { revalidate: 0 } });
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.USDT) symbolData.price = parseFloat(priceData.USDT);
        }
      } catch(_e) { console.warn('Live price fetch failed:', _e); }

      // Fetch 1H + 15M para aba Day Trade
      try {
        type Candle = { time: number; open: number; high: number; low: number; close: number; volumeto: number };
        const calcDT = (candles: Candle[]) => {
          if (candles.length < 30) return {};
          const closes = candles.map(c => c.close);
          const highs  = candles.map(c => c.high);
          const lows   = candles.map(c => c.low);
          const vols   = candles.map(c => c.volumeto ?? 0);
          const price  = closes[closes.length - 1];
          // RSI
          let g = 0, l = 0;
          for (let i = 1; i <= 14; i++) { const d = closes[i] - closes[i-1]; d >= 0 ? g += d : l -= d; }
          let ag = g / 14, al = l / 14;
          for (let i = 15; i < closes.length; i++) { const d = closes[i]-closes[i-1]; ag=(ag*13+(d>0?d:0))/14; al=(al*13+(d<0?-d:0))/14; }
          const rsi = al === 0 ? 100 : Math.round((100 - 100/(1 + ag/al)) * 10) / 10;
          // MACD
          const ema = (data: number[], p: number) => { const k=2/(p+1); let e=data[0]; for(let i=1;i<data.length;i++) e=data[i]*k+e*(1-k); return e; };
          const m = closes.map((_, i, a) => ema(a.slice(0, i+1), 12) - ema(a.slice(0, i+1), 26));
          const macdVal = m[m.length-1]; const sigVal = ema(m.slice(-50), 9);
          const macd_cross = macdVal > sigVal ? 'ALTA (BULLISH)' : 'BAIXA (BEARISH)';
          // ADX simplified
          let pdm=0, mdm=0, tr14=0;
          for (let i = Math.max(1, highs.length-14); i < highs.length; i++) {
            const up=highs[i]-highs[i-1], dn=lows[i-1]-lows[i];
            pdm += up>dn&&up>0?up:0; mdm += dn>up&&dn>0?dn:0;
            tr14 += Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1]));
          }
          const plus_di = tr14>0 ? Math.round(pdm/tr14*1000)/10 : 0;
          const minus_di = tr14>0 ? Math.round(mdm/tr14*1000)/10 : 0;
          const adx = Math.round(Math.abs(plus_di-minus_di)/Math.max(plus_di+minus_di,0.01)*1000)/10;
          // BB
          const sl = closes.slice(-20); const mean = sl.reduce((a,b)=>a+b,0)/sl.length;
          const sd = Math.sqrt(sl.reduce((a,b)=>a+Math.pow(b-mean,2),0)/sl.length);
          const bbu = mean + 2*sd, bbl = mean - 2*sd;
          const bb_position = price >= bbu ? 'SUPERIOR' : price <= bbl ? 'INFERIOR' : price > mean ? 'MEIO-SUPERIOR' : 'MEIO-INFERIOR';
          // EMA
          const ema21 = Math.round(ema(closes, 21)*10000)/10000;
          const ema50 = Math.round(ema(closes, 50)*10000)/10000;
          const ema_position = price>ema21&&price>ema50 ? 'BULLISH' : price<ema21&&price<ema50 ? 'BEARISH' : 'NEUTRO';
          // Volume
          const vol20 = vols.slice(-20).reduce((a,b)=>a+b,0)/20;
          const volume_ratio = Math.round((vol20>0 ? vols[vols.length-1]/vol20 : 1)*10)/10;
          return { rsi, macd_cross, macd_above_zero: macdVal>0, adx, adx_label: adx>25?'FORTE':adx>20?'FRACO':'SIDEWAYS', plus_di, minus_di, bb_position, bb_upper: Math.round(bbu*10000)/10000, bb_lower: Math.round(bbl*10000)/10000, ema21, ema50, ema_position, volume_ratio };
        };
        const [r1h, r15m] = await Promise.all([
          fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${cleanBase}&tsym=USDT&limit=100`, { next: { revalidate: 0 } }),
          fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${cleanBase}&tsym=USDT&limit=100&aggregate=15`, { next: { revalidate: 0 } })
        ]);
        if (r1h.ok)  { const j=await r1h.json();  if (j.Response==="Success"&&j.Data?.Data?.length>=30) symbolData.indicators_1h  = calcDT(j.Data.Data); }
        if (r15m.ok) { const j=await r15m.json(); if (j.Response==="Success"&&j.Data?.Data?.length>=30) symbolData.indicators_15m = calcDT(j.Data.Data); }
      } catch(_e) {}

      return NextResponse.json({
        analysis: symbolData,
        match: symbolData,
        history,
        allSymbols: Object.keys(fullData),
        allMatches: Object.keys(fullData).map(s => s.includes('/') ? s : `${s}/USDT`)
      });
    }

    if (botType === 'stocks') {
      return NextResponse.json(fullData);
    }

    return NextResponse.json(fullData);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Error reading bot data.' }, { status: 500 });
  }
}
