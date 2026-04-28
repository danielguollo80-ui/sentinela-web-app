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
    if (kv) {
      try {
        const raw = await kv.get(`sentinela:${botType}`);
        if (raw) {
            fullData = JSON.parse(raw);
        }
        await kv.quit();
      } catch (_e) {
        console.warn('KV not available.');
      }
    }

    // Local fallback for testing without Redis
    if (!fullData) {
      if (botType === 'football') {
        const resultsPath = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Futebol', 'latest_results_football.json');
        if (fs.existsSync(resultsPath)) fullData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      } else if (botType === 'stocks') {
        const resultsPath = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Acoes', 'latest_results_stocks.json');
        if (fs.existsSync(resultsPath)) fullData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      } else {
        const DATA_DIR = path.join(process.cwd(), 'data');
        const SYNC_FILE = path.join(DATA_DIR, 'bot_sync.json');
        if (fs.existsSync(SYNC_FILE)) fullData = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
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

          // 1. TRY BYBIT LINEAR (Futures)
          try {
            const res = await fetch(`https://api.bytick.com/v5/market/kline?category=linear&symbol=${pair}&interval=60&limit=1000`, { headers, next: { revalidate: 0 } });
            if (res.ok) {
              const json = await res.json();
              if (json.retCode === 0 && json.result?.list?.length > 0) {
                klines = json.result.list.reverse();
                source = "Bybit Linear";
              }
            }
          } catch(_e) {}

          // 2. TRY BYBIT SPOT (Fallback for smaller coins)
          if (klines.length === 0) {
            try {
              const res = await fetch(`https://api.bytick.com/v5/market/kline?category=spot&symbol=${pair}&interval=60&limit=1000`, { headers, next: { revalidate: 0 } });
              if (res.ok) {
                const json = await res.json();
                if (json.retCode === 0 && json.result?.list?.length > 0) {
                  klines = json.result.list.reverse();
                  source = "Bybit Spot";
                }
              }
            } catch(_e) {}
          }

          // 3. TRY CRYPTOCOMPARE (Ultimate Global Fallback)
          if (klines.length === 0) {
            try {
              // Limpeza extra para CryptoCompare (ex: WOOUSDT -> WOO)
              const ccBase = cleanBase.replace('USDT', '');
              const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${ccBase}&tsym=USDT&limit=500`, { headers, next: { revalidate: 0 } });
              if (res.ok) {
                const json = await res.json();
                if (json.Response === "Success" && json.Data?.Data?.length > 0) {
                  klines = json.Data.Data.map((d: Record<string, unknown>) => [
                    (d.time as number) * 1000, d.open, d.high, d.low, d.close, d.volumeto
                  ]);
                  source = "CryptoCompare";
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
          const price = closes[closes.length - 1];
          
          const { calculateRSI, calculateMACD, calculateBB, calculateEMA, calculateADX, calculateATR } = await import('@/lib/indicators');
          const rsi = calculateRSI(closes, 14);
          const macd = calculateMACD(closes);
          const bb = calculateBB(closes);
          const adxData = calculateADX(highs, lows, closes, 14);
          const atr = calculateATR(highs, lows, closes, 14).pop() ?? 0;
          const ema21 = calculateEMA(closes, 21).pop() ?? 0;
          const ema50 = calculateEMA(closes, 50).pop() ?? 0;
          const ema200 = calculateEMA(closes, 200).pop() ?? 0;
          const poc = bb.upper - (bb.upper - bb.lower) / 2;

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
              vmc_dot: rsi > 70 ? "RED" : rsi < 30 ? "GREEN" : "NEUTRAL", 
              wt1: macd.aboveZero ? 10 : -10, 
              wt_dir: emaPos.includes("BULLISH") ? "UPWARD" : "DOWNWARD",
              macd_cross: macd.cross
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

            if (!anthropic.apiKey) {
              throw new Error("API Key ausente");
            }

            const prompt = `Analise a criptomoeda ${selectedSymbol} (Fonte: ${source}):
            - Preço Atual: $${price}
            - RSI (1D): ${rsi.toFixed(2)}
            - Tendência EMA: ${emaPos}
            - Força da Tendência (ADX): ${adxData.adx.toFixed(2)}
            - POC (Pivot): $${poc.toFixed(6)}
            - Direcional: DI+ (${adxData.plusDI.toFixed(2)}) / DI- (${adxData.minusDI.toFixed(2)})
            
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

      // Prioritize chart data from the bot payload
      let history = (symbolData.history as unknown[]) || [];

      if (history.length === 0) {
        try {
          const cleanSymbol = ((symbolData.symbol as string) || selectedSymbol).replace('/', '').replace(':USDT', '').toUpperCase();
          const cleanBase = cleanSymbol.replace('USDT', '');
          const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${cleanBase}&tsym=USDT&limit=100`, { next: { revalidate: 0 } });
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
      }

      // Live Price Override for Cached Symbols
      try {
        const cleanBase = (((symbolData.symbol as string) || selectedSymbol)).replace('/', '').replace('USDT', '').replace(':USDT', '').toUpperCase();
        const priceRes = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${cleanBase}&tsyms=USDT`, { next: { revalidate: 0 } });
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.USDT) {
            symbolData.price = parseFloat(priceData.USDT);
          }
        }
      } catch(_e) {
        console.warn('Live price fetch failed:', _e);
      }

      return NextResponse.json({ 
        analysis: symbolData, 
        match: symbolData, 
        history, 
        allSymbols: Object.keys(fullData),
        allMatches: Object.keys(fullData).map(s => s.includes('/') ? s : `${s}/USDT`)
      });
    }

    if (botType === 'stocks') {
      if (symbol) {
        const stockData = fullData[symbol.toUpperCase()];
        if (!stockData) return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        return NextResponse.json({ analysis: stockData });
      }
      return NextResponse.json(fullData);
    }

    return NextResponse.json(fullData);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Error reading bot data.' }, { status: 500 });
  }
}
