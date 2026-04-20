import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

// Only initialize KV if we have a URL
const url = process.env.KV_REST_API_URL || process.env.REDIS_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.REDIS_REST_API_TOKEN;

const kv = url ? createClient({
  url: url,
  token: token || '',
}) : null;

// Simple security token to prevent unauthorized POSTs
const AUTH_TOKEN = process.env.SYNC_AUTH_TOKEN || 'sentinela_default_secret';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const botType = searchParams.get('bot') || 'crypto';

    if (token !== AUTH_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Store in KV (Cloud Storage)
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

    // 1. TRY CLOUD (KV) FIRST
    let cloudData: any = null;
    if (kv) {
      try {
        cloudData = await kv.get(`sentinela:${botType}`);
      } catch (e) {
        console.warn('Cloud KV not available or not linked yet.');
      }
    }

    let fullData = cloudData;

    // 2. FALLBACK TO LOCAL FILE (Only if Cloud has no data and we are in local dev)
    if (!fullData) {
      let filePath = '';
      if (botType === 'football') {
        const resultsPath = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Futebol', 'latest_results_football.json');
        const legacyPath = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Futebol', 'latest_analysis_football.json');
        filePath = fs.existsSync(resultsPath) ? resultsPath : legacyPath;
      } else {
        filePath = path.join('C:', 'Users', 'Gabriel', '.gemini', 'antigravity', 'scratch', 'Bot-Bitcoin', 'latest_results_crypto.json');
      }

      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        fullData = JSON.parse(fileContent);
      }
    }

    if (!fullData) {
      return NextResponse.json({ error: `No ${botType} data found.` }, { status: 404 });
    }

    // 3. PROCESS DATA (Same logic as before)
    if (botType === 'football') {
        const selectedMatch = symbol || Object.keys(fullData)[0];
        const matchData = fullData[selectedMatch];

        return NextResponse.json({
            match: matchData,
            allMatches: Object.keys(fullData)
        });
    }

    if (botType === 'crypto') {
      const selectedSymbol = symbol || Object.keys(fullData)[0];
      const symbolData = fullData[selectedSymbol];

      if (!symbolData) {
        return NextResponse.json({ error: 'Symbol not found.' }, { status: 404 });
      }

      // FETCH REAL 1H DATA FROM BINANCE
      try {
        const binanceSymbol = symbolData.symbol.replace('/', '');
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1h&limit=500`;
        const binanceRes = await fetch(binanceUrl);
        
        if (binanceRes.ok) {
          const klines = await binanceRes.json();
          const history = klines.map((k: any) => ({
            time: k[0] / 1000,
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4])
          }));

          return NextResponse.json({
            analysis: symbolData,
            history: history,
            allSymbols: Object.keys(fullData)
          });
        }
      } catch (fetchErr) {
        console.error('Binance fetch error:', fetchErr);
      }

      return NextResponse.json({
        analysis: symbolData,
        history: [],
        allSymbols: Object.keys(fullData)
      });
    }

    return NextResponse.json(fullData);

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Error reading bot data.' }, { status: 500 });
  }
}

