import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

const url = process.env.KV_REST_API_URL || process.env.REDIS_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.REDIS_REST_API_TOKEN;

const kv = (url && url.startsWith('https://') && token) ? createClient({ url, token }) : null;

const AUTH_TOKEN = process.env.SYNC_AUTH_TOKEN || '';
const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sentinel-crypto-api-production.up.railway.app';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const botType = searchParams.get('bot') || 'crypto';

    if (token !== AUTH_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (kv) {
      await kv.set(`sentinela:${botType}`, data);
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

    // 1. TRY KV (cloud)
    let fullData: any = null;
    if (kv) {
      try {
        fullData = await kv.get(`sentinela:${botType}`);
      } catch (e) {
        console.warn('KV not available.');
      }
    }

    // 2. FALLBACK: Railway API (crypto) or local file (football)
    if (!fullData) {
      if (botType === 'crypto') {
        try {
          const res = await fetch(`${RAILWAY_URL}/latest`, { next: { revalidate: 300 } });
          if (res.ok) {
            const json = await res.json();
            fullData = json.symbols || {};
          }
        } catch (e) {
          console.warn('Railway /latest fetch failed:', e);
        }
      } else if (botType === 'football') {
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
