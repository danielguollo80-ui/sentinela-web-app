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
      const key = `sentinela:${botType}`;
      // Crypto: o day-trade envia só símbolos com scalp — faz merge para não apagar o resto do painel
      if (botType === 'crypto' && data && typeof data === 'object' && !Array.isArray(data)) {
        let merged: Record<string, unknown> = {};
        try {
          const prev = await kv.get(key);
          if (prev) merged = JSON.parse(prev) as Record<string, unknown>;
        } catch {
          merged = {};
        }
        merged = { ...merged, ...(data as Record<string, unknown>) };
        await kv.set(key, JSON.stringify(merged));
      } else {
        await kv.set(key, JSON.stringify(data));
      }
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
    const noAI = searchParams.get('noai') === '1';
    const liveRequested = searchParams.get('live') === '1';

    const url = process.env.REDIS_URL || '';
    const kv = url ? new Redis(url) : null;

    let fullData: Record<string, unknown> | null = null;

    // Monorepo: sentinela-web-app em scratch/sentinela-web-app → raiz = ..
    const scratchRoot = path.resolve(process.cwd(), '..');

    // Ficheiros JSON escritos pelos bots (prioridade em dev no mesmo PC)
    const LOCAL_PATHS: Record<string, string> = {
      football: path.join(scratchRoot, 'bots', 'Bot-Futebol', 'latest_results_football.json'),
      stocks: path.join(scratchRoot, 'bots', 'Bot-Acoes', 'latest_results_stocks.json'),
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

    // Crypto: cache multi-moeda gerado pelo Bot-Bitcoin (mesmo formato que POST Redis)
    if (!fullData && botType === 'crypto') {
      const cryptoLatest = path.join(scratchRoot, 'bots', 'Bot-Bitcoin', 'latest_results_crypto.json');
      if (fs.existsSync(cryptoLatest)) {
        try {
          fullData = JSON.parse(fs.readFileSync(cryptoLatest, 'utf8'));
        } catch {
          fullData = null;
        }
      }
      const DATA_DIR = path.join(process.cwd(), 'data');
      const SYNC_FILE = path.join(DATA_DIR, 'bot_sync.json');
      if (!fullData && fs.existsSync(SYNC_FILE)) {
        try {
          fullData = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
        } catch {
          fullData = null;
        }
      }
    }

    // Stocks real-time fallback (runs before fullData null check)
    if (botType === 'stocks' && symbol) {
      const sym = symbol.toUpperCase();
      // Helper: busca pré-market via Yahoo Finance quote API
      const fetchPreMarket = async (ticker: string) => {
        try {
          const h = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
          const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}&fields=preMarketPrice,preMarketChange,preMarketChangePercent`, { headers: h, next: { revalidate: 60 } });
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
          { headers, next: { revalidate: 60 } }
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
        const closes  = ((quotes.close  || []) as (number | null)[]).filter((c): c is number => c != null);
        const highs   = ((quotes.high   || []) as (number | null)[]).filter((h): h is number => h != null);
        const lows    = ((quotes.low    || []) as (number | null)[]).filter((l): l is number => l != null);
        const vols1d  = ((quotes.volume || []) as (number | null)[]).filter((v): v is number => v != null);
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
            adx_label: adxData.adx >= 35 ? "FORTE" : adxData.adx >= 20 ? "MODERADO" : "FRACO",
            atr_pct: price > 0 ? Math.round((atr / price) * 10000) / 100 : 0,
            plus_di: (adxData.plusDI + adxData.minusDI) === 0 ? 0 : Math.round((adxData.plusDI / (adxData.plusDI + adxData.minusDI)) * 1000) / 10,
            minus_di: (adxData.plusDI + adxData.minusDI) === 0 ? 0 : Math.round((adxData.minusDI / (adxData.plusDI + adxData.minusDI)) * 1000) / 10,
            volume_ratio: (() => { const avg = vols1d.length >= 20 ? vols1d.slice(-20).reduce((a, b) => a + b, 0) / 20 : 0; return avg > 0 ? Math.round((vols1d[vols1d.length - 1] / avg) * 100) / 100 : 0; })(),
          },
          ai_analysis: `[Yahoo Finance] Analisando ${sym}...`,
          timestamp: Date.now() / 1000,
          last_update: new Date().toISOString()
        };
        // Pré-market em paralelo
        const pm = await fetchPreMarket(sym);
        if (pm) Object.assign(realtimeData, pm);
        // Multi-TF: busca 1H/15M/5M do Yahoo Finance e deriva 4H agregando 1H
        {
          const [res1h, res15m, res5m] = await Promise.all([
            fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1h&range=60d`, { headers, next: { revalidate: 120 } }),
            fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=15m&range=5d`, { headers, next: { revalidate: 60 } }),
            fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=5m&range=1d`, { headers, next: { revalidate: 30 } }),
          ]);
          type YQ = { close?: (number|null)[], high?: (number|null)[], low?: (number|null)[], volume?: (number|null)[] };
          type YChart = { chart?: { result?: Array<{ indicators?: { quote?: YQ[] } }> } };
          const extractCandles = (json: unknown) => {
            try {
              const r = (json as YChart)?.chart?.result?.[0];
              if (!r) return null;
              const q: YQ = r.indicators?.quote?.[0] || {};
              const c = (q.close  || []).filter((x): x is number => x != null);
              const h = (q.high   || []).filter((x): x is number => x != null);
              const l = (q.low    || []).filter((x): x is number => x != null);
              const v = (q.volume || []).filter((x): x is number => x != null);
              return c.length >= 20 ? { c, h, l, v } : null;
            } catch { return null; }
          };
          const calcTFStock = (c: number[], h: number[], l: number[], v: number[]) => {
            const { calculateRSI: R, calculateMACD: M, calculateBB: B, calculateADX: A, calculateATR: T, calculateEMA: E } = { calculateRSI, calculateMACD, calculateBB, calculateADX, calculateATR, calculateEMA };
            const rsiV = R(c, 14); const macdV = M(c); const bbV = B(c); const adxV = A(h, l, c, 14);
            const atrV = T(h, l, c, 14).pop() ?? 0; const e21 = E(c, 21).pop() ?? 0; const e50 = E(c, 50).pop() ?? 0;
            const p = c[c.length - 1];
            const emaTF = p > e21 && p > e50 ? 'BULLISH' : p < e21 && p < e50 ? 'BEARISH' : 'NEUTRO';
            const tot = adxV.plusDI + adxV.minusDI;
            const avg20 = v.length >= 20 ? v.slice(-20).reduce((a, b) => a + b, 0) / 20 : 0;
            return {
              rsi: rsiV, macd_cross: macdV.cross, macd_above_zero: macdV.aboveZero,
              bb_position: bbV.position, adx: adxV.adx,
              adx_label: adxV.adx >= 35 ? "FORTE" : adxV.adx >= 20 ? "MODERADO" : "FRACO",
              atr: atrV, atr_pct: p > 0 ? Math.round((atrV / p) * 10000) / 100 : 0,
              ema21: e21, ema50: e50, ema_position: emaTF,
              plus_di:  tot === 0 ? 0 : Math.round(adxV.plusDI  / tot * 1000) / 10,
              minus_di: tot === 0 ? 0 : Math.round(adxV.minusDI / tot * 1000) / 10,
              volume_ratio: avg20 > 0 ? Math.round((v[v.length - 1] / avg20) * 100) / 100 : 0,
            };
          };
          if (res1h.ok) {
            const d = extractCandles(await res1h.json());
            if (d) {
              realtimeData.indicators_1h = calcTFStock(d.c, d.h, d.l, d.v);
              // 4H: agrega cada 4 candles 1H
              const c4: number[] = [], h4: number[] = [], l4: number[] = [], v4: number[] = [];
              for (let i = 3; i < d.c.length; i += 4) {
                c4.push(d.c[i]);
                h4.push(Math.max(...d.h.slice(i - 3, i + 1)));
                l4.push(Math.min(...d.l.slice(i - 3, i + 1)));
                v4.push(d.v.slice(i - 3, i + 1).reduce((a, b) => a + b, 0));
              }
              if (c4.length >= 20) realtimeData.indicators_4h = calcTFStock(c4, h4, l4, v4);
            }
          }
          if (res15m.ok) { const d = extractCandles(await res15m.json()); if (d) realtimeData.indicators_15m = calcTFStock(d.c, d.h, d.l, d.v); }
          if (res5m.ok)  { const d = extractCandles(await res5m.json());  if (d) realtimeData.indicators_5m  = calcTFStock(d.c, d.h, d.l, d.v); }
        }
        // AI Analysis (skipped on auto-refresh)
        if (!noAI) { try {
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
        } }
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
      // Suporta ambos os formatos: "BTC", "BTC/USDT", "BTC/USDT:USDT" (Binance Futures)
      const resolveSymbol = (sym: string | null): string => {
        if (!sym) return Object.keys(fullData)[0] || "BTC/USDT";
        if (fullData[sym]) return sym;
        const withUsdt = sym.includes('/') ? sym : `${sym}/USDT`;
        if (fullData[withUsdt]) return withUsdt;
        // Formato Binance Futures: "AVAX/USDT:USDT"
        const withColon = withUsdt.includes(':') ? withUsdt : `${withUsdt}:USDT`;
        if (fullData[withColon]) return withColon;
        const short = sym.split('/')[0].toUpperCase();
        if (fullData[short]) return short;
        // Se não achou no cache, retorna o próprio símbolo para tentar o Live Fallback
        return sym.toUpperCase().includes('USDT') ? sym.toUpperCase() : `${sym.toUpperCase()}/USDT`;
      };
      const selectedSymbol = resolveSymbol(symbol);
      const symbolData = fullData[selectedSymbol] as Record<string, unknown>;

      if (!symbolData || liveRequested) {
        // MULTI-EXCHANGE REAL-TIME FALLBACK — também usado quando live=1 (busca manual do usuário)
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
            const res = await fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=${interval}&limit=500`, { headers, next: { revalidate: 60 } });
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
              const res = await fetch(`https://api.bytick.com/v5/market/kline?category=spot&symbol=${pair}&interval=${interval}&limit=500`, { headers, next: { revalidate: 60 } });
              if (res.ok) {
                const json = await res.json();
                if (json.retCode === 0 && json.result?.list?.length > 0) {
                  klines = json.result.list.reverse();
                  source = `Bybit Spot (${timeframeLabel})`;
                }
              }
            } catch(_e) {}
          }

          // OKX e KuCoin: acessíveis nos IPs US/iad1 do Vercel (Bybit é geo-bloqueada lá).
          // Formato alvo (igual ao Bybit revertido): [ts(ms), open, high, low, close, volume].
          const okxBar = interval === '120' ? '2H' : '4H';
          const kuType = interval === '120' ? '2hour' : '4hour';
          const ccBaseClean = cleanBase.replace('USDT', '');
          // 2.5 TRY OKX (DESC, [ts(ms),o,h,l,c,vol,...])
          if (klines.length === 0) {
            try {
              const res = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${ccBaseClean}-USDT&bar=${okxBar}&limit=300`, { headers, cache: 'no-store' });
              if (res.ok) {
                const json = await res.json();
                if (json.code === '0' && Array.isArray(json.data) && json.data.length > 0) {
                  klines = [...json.data].reverse().map((k: string[]) => [parseInt(k[0]), k[1], k[2], k[3], k[4], k[5]]);
                  source = `OKX (${timeframeLabel})`;
                }
              }
            } catch(_e) {}
          }
          // 2.6 TRY KUCOIN (DESC, [time(s),open,CLOSE,high,low,vol]) — remapeado p/ [ts(ms),o,h,l,c,vol]
          if (klines.length === 0) {
            try {
              const res = await fetch(`https://api.kucoin.com/api/v1/market/candles?type=${kuType}&symbol=${ccBaseClean}-USDT`, { headers, cache: 'no-store' });
              if (res.ok) {
                const json = await res.json();
                if (json.code === '200000' && Array.isArray(json.data) && json.data.length > 0) {
                  klines = [...json.data].reverse().map((k: string[]) => [parseInt(k[0]) * 1000, k[1], k[3], k[4], k[2], k[5]]);
                  source = `KuCoin (${timeframeLabel})`;
                }
              }
            } catch(_e) {}
          }

          // 3. TRY CRYPTOCOMPARE (Ultimate Global Fallback)
          if (klines.length === 0) {
            try {
              const ccBase = cleanBase.replace('USDT', '');
              const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${ccBase}&tsym=USDT&limit=1000&aggregate=4`, { headers, next: { revalidate: 300 } });
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
            s_1h: s1,
            r_1h: r1,
            s_4h: s2,
            r_4h: r2,
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

          // AI ANALYSIS (skipped on auto-refresh)
          if (!noAI) { try {
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
          } }
          // Fetch 1H + 15M + 5M para aba SCALP — calcDT no escopo p/ reuso entre Bybit e fallback Binance
          {
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
            // Converte klines Bybit (desc) → Candle[] (asc) para calcDT
            const bybitToCandles = (list: unknown[][]) =>
              [...list].reverse().map(k => ({
                time: parseInt(k[0] as string), open: parseFloat(k[1] as string),
                high: parseFloat(k[2] as string), low: parseFloat(k[3] as string),
                close: parseFloat(k[4] as string), volumeto: parseFloat(k[5] as string)
              }));
            // 1H/15M/5M via Bybit — try PRÓPRIO (a Bybit às vezes lança no Vercel)
            try {
              const [b1h, b15m, b5m, r1d] = await Promise.all([
                fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=60&limit=200`,  { headers, next: { revalidate: 120 } }),
                fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=15&limit=200`,  { headers, next: { revalidate: 60 } }),
                fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=5&limit=200`,   { headers, next: { revalidate: 30 } }),
                fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${cleanBase}&tsym=USDT&limit=200`, { next: { revalidate: 3600 } })
              ]);
              if (b1h.ok)  { const j=await b1h.json();  if (j.retCode===0&&j.result?.list?.length>=30) (realTimeData as Record<string,unknown>).indicators_1h  = calcDT(bybitToCandles(j.result.list)); }
              if (b15m.ok) { const j=await b15m.json(); if (j.retCode===0&&j.result?.list?.length>=30) (realTimeData as Record<string,unknown>).indicators_15m = calcDT(bybitToCandles(j.result.list)); }
              if (b5m.ok)  { const j=await b5m.json();  if (j.retCode===0&&j.result?.list?.length>=30) (realTimeData as Record<string,unknown>).indicators_5m  = calcDT(bybitToCandles(j.result.list)); }
              let _ccOk1d = false;
              if (r1d.ok)  { const j=await r1d.json();  if (j.Response==="Success"&&j.Data?.Data?.length>=30) { (realTimeData as Record<string,unknown>).indicators_1d  = calcDT(j.Data.Data); _ccOk1d = true; } }
              // Fallback Binance Futures 1D se o CryptoCompare falhou (rate limit). Sem isto, o card 1D
              // herda o RSI de TF curto pré-preenchido acima → mostra RSI alto errado (ex.: 55.9 em vez de 23).
              if (!_ccOk1d) {
                try {
                  const _fp1d = cleanBase.endsWith('USDT') ? cleanBase : `${cleanBase}USDT`;
                  const _bd = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${_fp1d}&interval=1d&limit=200`, { next: { revalidate: 3600 } });
                  if (_bd.ok) { const j = await _bd.json(); if (Array.isArray(j) && j.length >= 30) (realTimeData as Record<string,unknown>).indicators_1d = calcDT(j.map((k: unknown[]) => ({ time: k[0] as number, open: +(k[1] as string), high: +(k[2] as string), low: +(k[3] as string), close: +(k[4] as string), volumeto: +(k[5] as string) }))); }
                } catch(_e) {}
              }
            } catch(_e) {}

            // Fallback Binance Futures p/ TFs de scalp — try PRÓPRIO: roda mesmo se a Bybit lançou exceção.
            // O 5M não tem fallback de cache (bot não calcula 5M); sem isto fica vazio na aba SCALP.
            try {
              const rt0 = realTimeData as Record<string, unknown>;
              if (rt0.indicators_1h == null || rt0.indicators_15m == null || rt0.indicators_5m == null) {
                const toC = (list: unknown[][]) => list.map(k => ({
                  time: parseInt(k[0] as string), open: parseFloat(k[1] as string),
                  high: parseFloat(k[2] as string), low: parseFloat(k[3] as string),
                  close: parseFloat(k[4] as string), volumeto: parseFloat(k[5] as string)
                }));
                const fpair = cleanBase.endsWith('USDT') ? cleanBase : `${cleanBase}USDT`;
                const [g1h, g15m, g5m] = await Promise.all([
                  rt0.indicators_1h  == null ? fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${fpair}&interval=1h&limit=200`,  { next: { revalidate: 120 } }) : null,
                  rt0.indicators_15m == null ? fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${fpair}&interval=15m&limit=200`, { next: { revalidate: 60 } })  : null,
                  rt0.indicators_5m  == null ? fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${fpair}&interval=5m&limit=200`,  { next: { revalidate: 30 } })  : null,
                ]);
                if (g1h  && g1h.ok)  { const j=await g1h.json();  if (Array.isArray(j)&&j.length>=30) rt0.indicators_1h  = calcDT(toC(j)); }
                if (g15m && g15m.ok) { const j=await g15m.json(); if (Array.isArray(j)&&j.length>=30) rt0.indicators_15m = calcDT(toC(j)); }
                if (g5m  && g5m.ok)  { const j=await g5m.json();  if (Array.isArray(j)&&j.length>=30) rt0.indicators_5m  = calcDT(toC(j)); }
              }
            } catch(_e) {}
          }

          // Injeta dados do bot do cache se disponível (live=1 forçou fallback mas símbolo existe no Redis)
          if (symbolData) {
            // Sempre sobrescreve: setup, veredito e labels do bot
            const alwaysInject = ['setup', 'veredito', 'rev_type', 'confluence_label', 'scalper_score', 'scalper_label'];
            for (const k of alwaysInject) {
              if (symbolData[k] != null) (realTimeData as Record<string, unknown>)[k] = symbolData[k];
            }
            // Fallback: injeta 1H/15M do bot apenas se o CryptoCompare falhou (rate limit, etc.)
            const rt = realTimeData as Record<string, unknown>;
            if (rt.indicators_1h == null && symbolData.indicators_1h != null)   rt.indicators_1h  = symbolData.indicators_1h;
            if (rt.indicators_15m == null && symbolData.indicators_15m != null) rt.indicators_15m = symbolData.indicators_15m;
          }

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

      // Chart history: candles 4H via cadeia de fontes acessíveis de qualquer região.
      // O CryptoCompare passou a exigir API key (HTTP 401), então OKX/KuCoin/Binance são as
      // fontes primárias (OKX e KuCoin funcionam mesmo nos IPs US/iad1 do Vercel, onde Binance é geo-bloqueada).
      // time é normalizado para SEGUNDOS (formato que o lightweight-charts espera), ordem ASC.
      let history: unknown[] = [];
      try {
        const cleanSymbol = ((symbolData.symbol as string) || selectedSymbol).replace('/', '').replace(':USDT', '').toUpperCase();
        const cleanBase = cleanSymbol.replace('USDT', '');
        const _hh = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' };
        type HCandle = { time: number; open: number; high: number; low: number; close: number };
        let hc: HCandle[] = [];
        // 1) OKX (bar=4H, DESC, [ts(ms),o,h,l,c,...]) — acessível em US (iad1)
        if (hc.length < 30) { try {
          const _r = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${cleanBase}-USDT&bar=4H&limit=300`, { headers: _hh, cache: 'no-store' });
          if (_r.ok) { const _j = await _r.json(); if (_j.code === '0' && Array.isArray(_j.data) && _j.data.length >= 30)
            hc = [..._j.data].reverse().map((k: string[]) => ({ time: Math.floor(parseInt(k[0]) / 1000), open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]) })); }
        } catch(_e) {} }
        // 2) KuCoin (type=4hour, DESC, [time(s),open,CLOSE,high,low,vol]) — ordem de campos atípica
        if (hc.length < 30) { try {
          const _r = await fetch(`https://api.kucoin.com/api/v1/market/candles?type=4hour&symbol=${cleanBase}-USDT`, { headers: _hh, cache: 'no-store' });
          if (_r.ok) { const _j = await _r.json(); if (_j.code === '200000' && Array.isArray(_j.data) && _j.data.length >= 30)
            hc = [..._j.data].reverse().map((k: string[]) => ({ time: parseInt(k[0]), open: parseFloat(k[1]), close: parseFloat(k[2]), high: parseFloat(k[3]), low: parseFloat(k[4]) })); }
        } catch(_e) {} }
        // 3) Binance Futures (4h, ASC, [openTime(ms),o,h,l,c,...]) — só funciona fora de US
        if (hc.length < 30) { try {
          const _fp = cleanBase.endsWith('USDT') ? cleanBase : `${cleanBase}USDT`;
          const _r = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${_fp}&interval=4h&limit=300`, { next: { revalidate: 300 } });
          if (_r.ok) { const _j = await _r.json() as unknown[][]; if (Array.isArray(_j) && _j.length >= 30)
            hc = _j.map(k => ({ time: Math.floor(parseInt(k[0] as string) / 1000), open: parseFloat(k[1] as string), high: parseFloat(k[2] as string), low: parseFloat(k[3] as string), close: parseFloat(k[4] as string) })); }
        } catch(_e) {} }
        // 4) CryptoCompare (legado — agora exige API key; mantido só como último recurso)
        if (hc.length < 30) { try {
          const _r = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${cleanBase}&tsym=USDT&limit=540&aggregate=4`, { next: { revalidate: 300 } });
          if (_r.ok) { const _j = await _r.json(); if (_j.Response === "Success" && _j.Data?.Data)
            hc = _j.Data.Data.map((d: Record<string, number>) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })); }
        } catch(_e) {} }
        history = hc;
      } catch(_e) {}
      // Fallback to bot cache if all live sources failed
      if (history.length === 0) history = (symbolData.history as unknown[]) || [];

      // Calcula S/R via pivot se o bot não enviou campos nomeados
      if (!symbolData.s_1h && history.length >= 2) {
        const hist = history as Array<{high: number; low: number; close: number}>;
        const prevH = hist[hist.length - 2].high;
        const prevL = hist[hist.length - 2].low;
        const prevC = hist[hist.length - 2].close;
        const pp = (prevH + prevL + prevC) / 3;
        symbolData.r_1h = (2 * pp) - prevL;
        symbolData.s_1h = (2 * pp) - prevH;
        symbolData.r_4h = pp + (prevH - prevL);
        symbolData.s_4h = pp - (prevH - prevL);
      }

      const cleanBase = (((symbolData.symbol as string) || selectedSymbol)).replace('/', '').replace('USDT', '').replace(':USDT', '').toUpperCase();

      // Live Price Override for Cached Symbols
      try {
        const priceRes = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${cleanBase}&tsyms=USDT`, { next: { revalidate: 30 } });
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.USDT) symbolData.price = parseFloat(priceData.USDT);
        }
      } catch(_e) { console.warn('Live price fetch failed:', _e); }

      // Fetch 5M ao vivo — o bot não exporta indicators_5m para o Redis, por isso fica vazio na aba SCALP
      // Fonte primária: Bybit via bytick (api.binance.com E fapi.binance.com são geo-bloqueados nos IPs US do Vercel)
      if (!symbolData.indicators_5m) {
        try {
          const _fp5 = `${cleanBase}USDT`;
          const _h5 = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/json' };
          type Candle5 = { time: number; open: number; high: number; low: number; close: number; volumeto: number };
          let _c5: Candle5[] = [];
          // Cadeia de fontes acessíveis de US East (iad1) — Binance/Bybit geo-bloqueiam US.
          // 1) OKX (USDT, ordem DESC, OHLC) — [ts,o,h,l,c,vol]
          if (_c5.length < 30) { try {
            const _r = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${cleanBase}-USDT&bar=5m&limit=200`, { headers: _h5, cache: 'no-store' });
            if (_r.ok) { const _j = await _r.json(); if (_j.code === '0' && Array.isArray(_j.data) && _j.data.length >= 30)
              _c5 = [..._j.data].reverse().map((k: string[]) => ({ time: parseInt(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volumeto: parseFloat(k[5]) })); }
          } catch(_e) {} }
          // 2) KuCoin (USDT, ordem DESC) — [time(s),open,CLOSE,high,low,vol] (ordem de campos atípica)
          if (_c5.length < 30) { try {
            const _r = await fetch(`https://api.kucoin.com/api/v1/market/candles?type=5min&symbol=${cleanBase}-USDT`, { headers: _h5, cache: 'no-store' });
            if (_r.ok) { const _j = await _r.json(); if (_j.code === '200000' && Array.isArray(_j.data) && _j.data.length >= 30)
              _c5 = [..._j.data].reverse().map((k: string[]) => ({ time: parseInt(k[0]) * 1000, open: parseFloat(k[1]), close: parseFloat(k[2]), high: parseFloat(k[3]), low: parseFloat(k[4]), volumeto: parseFloat(k[5]) })); }
          } catch(_e) {} }
          // 3) Coinbase (par USD, ordem DESC) — [time(s),low,high,open,close,vol] (US-based, garantido em iad1)
          if (_c5.length < 30) { try {
            const _r = await fetch(`https://api.exchange.coinbase.com/products/${cleanBase}-USD/candles?granularity=300`, { headers: _h5, cache: 'no-store' });
            if (_r.ok) { const _j = await _r.json() as number[][]; if (Array.isArray(_j) && _j.length >= 30)
              _c5 = [..._j].reverse().map(k => ({ time: k[0] * 1000, low: k[1], high: k[2], open: k[3], close: k[4], volumeto: k[5] })); }
          } catch(_e) {} }
          // 4) Bybit (bytick) — ordem DESC; só funciona fora de US
          if (_c5.length < 30) { try {
            const _rby = await fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${_fp5}&interval=5&limit=200`, { headers: _h5, cache: 'no-store' });
            if (_rby.ok) { const _jb = await _rby.json(); if (_jb.retCode === 0 && Array.isArray(_jb.result?.list) && _jb.result.list.length >= 30)
              _c5 = [..._jb.result.list].reverse().map((k: unknown[]) => ({ time: parseInt(k[0] as string), open: parseFloat(k[1] as string), high: parseFloat(k[2] as string), low: parseFloat(k[3] as string), close: parseFloat(k[4] as string), volumeto: parseFloat(k[5] as string) })); }
          } catch(_e) {} }
          // 5) Binance Spot/FAPI (ordem ASC) — só funciona fora de US
          if (_c5.length < 30) {
            let _r5m = await fetch(`https://api.binance.com/api/v3/klines?symbol=${_fp5}&interval=5m&limit=200`, { cache: 'no-store' });
            if (!_r5m.ok) _r5m = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${_fp5}&interval=5m&limit=200`, { cache: 'no-store' });
            if (_r5m.ok) {
              const _j5 = await _r5m.json() as unknown[][];
              if (Array.isArray(_j5) && _j5.length >= 30)
                _c5 = _j5.map(k => ({ time: parseInt(k[0] as string), open: parseFloat(k[1] as string), high: parseFloat(k[2] as string), low: parseFloat(k[3] as string), close: parseFloat(k[4] as string), volumeto: parseFloat(k[5] as string) }));
            }
          }
          if (_c5.length >= 30) {
            {
              const closes=_c5.map(c=>c.close); const highs=_c5.map(c=>c.high); const lows=_c5.map(c=>c.low); const vols=_c5.map(c=>c.volumeto);
              let g=0,l=0; for(let i=1;i<=14;i++){const d=closes[i]-closes[i-1];d>=0?g+=d:l-=d;} let ag=g/14,al=l/14;
              for(let i=15;i<closes.length;i++){const d=closes[i]-closes[i-1];ag=(ag*13+(d>0?d:0))/14;al=(al*13+(d<0?-d:0))/14;}
              const rsi5=al===0?100:Math.round((100-100/(1+ag/al))*10)/10;
              const ema5=(data:number[],p:number)=>{const k=2/(p+1);let e=data[0];for(let i=1;i<data.length;i++)e=data[i]*k+e*(1-k);return e;};
              const m5=closes.map((_,i,a)=>ema5(a.slice(0,i+1),12)-ema5(a.slice(0,i+1),26)); const mv5=m5[m5.length-1]; const sv5=ema5(m5.slice(-50),9);
              const macd_cross5=mv5>sv5?'ALTA (BULLISH)':'BAIXA (BEARISH)';
              let pdm=0,mdm=0,tr14=0; for(let i=Math.max(1,highs.length-14);i<highs.length;i++){const up=highs[i]-highs[i-1],dn=lows[i-1]-lows[i]; pdm+=up>dn&&up>0?up:0;mdm+=dn>up&&dn>0?dn:0;tr14+=Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1]));}
              const plus_di5=tr14>0?Math.round(pdm/tr14*1000)/10:0; const minus_di5=tr14>0?Math.round(mdm/tr14*1000)/10:0;
              const adx5=Math.round(Math.abs(plus_di5-minus_di5)/Math.max(plus_di5+minus_di5,0.01)*1000)/10;
              const sl5=closes.slice(-20); const mean5=sl5.reduce((a,b)=>a+b,0)/sl5.length; const sd5=Math.sqrt(sl5.reduce((a,b)=>a+Math.pow(b-mean5,2),0)/sl5.length);
              const bbu5=mean5+2*sd5,bbl5=mean5-2*sd5; const p5=closes[closes.length-1];
              const bb_position5=p5>=bbu5?'SUPERIOR':p5<=bbl5?'INFERIOR':p5>mean5?'MEIO-SUPERIOR':'MEIO-INFERIOR';
              const ema21_5=Math.round(ema5(closes,21)*10000)/10000; const ema50_5=Math.round(ema5(closes,50)*10000)/10000;
              const ema_position5=p5>ema21_5&&p5>ema50_5?'BULLISH':p5<ema21_5&&p5<ema50_5?'BEARISH':'NEUTRO';
              const vol20_5=vols.slice(-20).reduce((a,b)=>a+b,0)/20; const volume_ratio5=Math.round((vol20_5>0?vols[vols.length-1]/vol20_5:1)*10)/10;
              symbolData.indicators_5m = { rsi: rsi5, macd_cross: macd_cross5, macd_above_zero: mv5>0, adx: adx5, adx_label: adx5>25?'FORTE':adx5>20?'FRACO':'SIDEWAYS', plus_di: plus_di5, minus_di: minus_di5, bb_position: bb_position5, ema21: ema21_5, ema50: ema50_5, ema_position: ema_position5, volume_ratio: volume_ratio5 };
            }
          }
        } catch(_e) {}
      }

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
        // Binance Futures (fapi) — mesma fonte do bot, sem rate limit no Vercel
        const pair = cleanBase.endsWith('USDT') ? cleanBase : `${cleanBase}USDT`;
        const binanceToCandles = (list: unknown[][]) =>
          list.map(k => ({
            time: parseInt(k[0] as string), open: parseFloat(k[1] as string),
            high: parseFloat(k[2] as string), low: parseFloat(k[3] as string),
            close: parseFloat(k[4] as string), volumeto: parseFloat(k[5] as string)
          }));
        const [f1h, f15m] = await Promise.all([
          fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=1h&limit=200`,  { next: { revalidate: 120 } }),
          fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=15m&limit=200`, { next: { revalidate: 60 } }),
        ]);
        if (f1h.ok)  { const j=await f1h.json();  if (Array.isArray(j)&&j.length>=30) symbolData.indicators_1h  = calcDT(binanceToCandles(j)); }
        if (f15m.ok) { const j=await f15m.json(); if (Array.isArray(j)&&j.length>=30) symbolData.indicators_15m = calcDT(binanceToCandles(j)); }
        // 5M: fallback extra via Bybit (já preenchido pelo bloco standalone acima na maioria dos casos)
        if (!symbolData.indicators_5m) {
          try {
            const _h = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
            const f5m = await fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=5&limit=200`, { headers: _h, cache: 'no-store' });
            if (f5m.ok) { const j=await f5m.json(); if (j.retCode===0 && Array.isArray(j.result?.list) && j.result.list.length>=30) symbolData.indicators_5m = calcDT([...j.result.list].reverse().map((k: unknown[]) => ({ time: parseInt(k[0] as string), open: parseFloat(k[1] as string), high: parseFloat(k[2] as string), low: parseFloat(k[3] as string), close: parseFloat(k[4] as string), volumeto: parseFloat(k[5] as string) }))); }
          } catch(_e) {}
        }
        // Fallback CryptoCompare se Binance não retornou (moeda não listada em futuros)
        if (!symbolData.indicators_1h) {
          const r1h = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${cleanBase}&tsym=USDT&limit=100`, { next: { revalidate: 120 } });
          if (r1h.ok) { const j=await r1h.json(); if (j.Response==="Success"&&j.Data?.Data?.length>=30) symbolData.indicators_1h = calcDT(j.Data.Data); }
        }
        if (!symbolData.indicators_15m) {
          const r15m = await fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${cleanBase}&tsym=USDT&limit=100&aggregate=15`, { next: { revalidate: 60 } });
          if (r15m.ok) { const j=await r15m.json(); if (j.Response==="Success"&&j.Data?.Data?.length>=30) symbolData.indicators_15m = calcDT(j.Data.Data); }
        }
        if (!symbolData.indicators_5m) {
          const r5m = await fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${cleanBase}&tsym=USDT&limit=100&aggregate=5`, { next: { revalidate: 30 } });
          if (r5m.ok) { const j=await r5m.json(); if (j.Response==="Success"&&j.Data?.Data?.length>=30) symbolData.indicators_5m = calcDT(j.Data.Data); }
        }
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
