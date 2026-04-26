import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sentinel-crypto-api-production.up.railway.app';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenParams = searchParams.get('token');
    const botType = searchParams.get('bot') || 'crypto';

    const AUTH_TOKEN = (process.env.SYNC_AUTH_TOKEN || 'sentinela_2026_secure').trim();

    if (tokenParams !== AUTH_TOKEN) {
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
    console.error('Post sync error:', error);
    return NextResponse.json({ error: 'Error saving data.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botType = searchParams.get('bot') || 'crypto';
    const symbol = searchParams.get('symbol');

    // Inicializa a conexão com o banco de dados
    const url = process.env.REDIS_URL || '';
    const kv = url ? new Redis(url) : null;

    // 1. TRY KV (cloud)
    let fullData: any = null;
    if (kv) {
      try {
        const raw = await kv.get(`sentinela:${botType}`);
        if (raw) {
            fullData = JSON.parse(raw);
        }
        await kv.quit();
      } catch (e) {
        console.warn('KV not available.');
      }
    }

    // 2. FALLBACK: Local file (football apenas) ou em caso de erro no Redis
    if (!fullData) {
      if (botType === 'football') {
        const resultsPath = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Futebol', 'latest_results_football.json');
        const legacyPath  = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Futebol', 'latest_analysis_football.json');
        const filePath = fs.existsSync(resultsPath) ? resultsPath : (fs.existsSync(legacyPath) ? legacyPath : '');
        if (filePath) {
          fullData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      }
    }

    if (!fullData || Object.keys(fullData).length === 0) {
      return NextResponse.json({ error: `No ${botType} data found.` }, { status: 404 });
    }

    // 3. PROCESS
    if (botType === 'football') {
      const selectedMatch = symbol || Object.keys(fullData)[0];
      const matchData = fullData[selectedMatch];
      return NextResponse.json({ match: matchData, allMatches: Object.keys(fullData) });
    }

    if (botType === 'crypto') {
      const selectedSymbol = symbol || Object.keys(fullData)[0];
      const symbolData = fullData[selectedSymbol];

      if (!symbolData) {
        return NextResponse.json({ error: 'Symbol not found.' }, { status: 404 });
      }

      // Fetch chart data from Binance
      try {
        const binanceSymbol = symbolData.symbol.replace('/', '');
        const binanceRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1h&limit=500`);
        if (binanceRes.ok) {
          const klines = await binanceRes.json();
          const history = klines.map((k: any) => ({
            time: k[0] / 1000,
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4])
          }));
          return NextResponse.json({ analysis: symbolData, history, allSymbols: Object.keys(fullData) });
        }
      } catch (fetchErr) {
        console.error('Binance fetch error:', fetchErr);
      }

      return NextResponse.json({ analysis: symbolData, history: [], allSymbols: Object.keys(fullData) });
    }

    return NextResponse.json(fullData);

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Error reading bot data.' }, { status: 500 });
  }
}
