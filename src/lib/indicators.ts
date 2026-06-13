
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number {
  if (data.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine.slice(-100), 9);
  
  const currentMacd = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  
  return {
    line: currentMacd,
    signal: currentSignal,
    cross: currentMacd > currentSignal ? "ALTA (BULLISH)" : "BAIXA (BEARISH)",
    aboveZero: currentMacd > 0
  };
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14) {
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < highs.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  const atr: number[] = [tr.slice(0, period).reduce((a, b) => a + b, 0) / period];
  for (let i = period; i < tr.length; i++) {
    atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
  }
  return atr;
}

export function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14) {
  const n = highs.length;
  if (n < period * 2) return { adx: 0, plusDI: 0, minusDI: 0 };

  // True Range e DM brutos
  const tr: number[] = [], plusDM: number[] = [], minusDM: number[] = [];
  for (let i = 1; i < n; i++) {
    const upMove   = highs[i]  - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }

  // Suavização de Wilder (soma inicial + rollover)
  let trS = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let pS  = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let mS  = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dx: number[] = [];
  const addDX = (p: number, m: number, t: number) => {
    if (t === 0) return;
    const pdi = (p / t) * 100;
    const mdi = (m / t) * 100;
    const sum = pdi + mdi;
    dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100);
  };
  addDX(pS, mS, trS);

  for (let i = period; i < tr.length; i++) {
    trS = trS - trS / period + tr[i];
    pS  = pS  - pS  / period + plusDM[i];
    mS  = mS  - mS  / period + minusDM[i];
    addDX(pS, mS, trS);
  }

  // ADX = EMA de Wilder dos DX
  let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dx.length; i++) adx = (adx * (period - 1) + dx[i]) / period;

  // DI+ e DI- finais normalizados
  const plusDI  = trS > 0 ? (pS / trS) * 100 : 0;
  const minusDI = trS > 0 ? (mS / trS) * 100 : 0;

  return {
    adx:     Math.round(adx     * 10) / 10,
    plusDI:  Math.round(plusDI  * 10) / 10,
    minusDI: Math.round(minusDI * 10) / 10,
  };
}

export function calculateBB(data: number[], period: number = 20, stdDev: number = 2) {
  const slice = data.slice(-period);
  const n = slice.length || 1;
  const mean = slice.reduce((a, b) => a + b, 0) / n;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const sd = Math.sqrt(variance);
  
  const upper = mean + stdDev * sd;
  const lower = mean - stdDev * sd;
  const price = data[data.length - 1];
  
  let pos = "MEIO";
  if (price >= upper) pos = "TOPO (SUPERIOR)";
  else if (price <= lower) pos = "FUNDO (INFERIOR)";
  else if (price > mean) pos = "MEIO-SUPERIOR";
  else pos = "MEIO-INFERIOR";
  
  return { upper, lower, mean, position: pos, width: (upper - lower) / mean };
}

export function calculateMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  
  const tp = highs.map((h, i) => (h + lows[i] + closes[i]) / 3);
  const rmf = tp.map((t, i) => t * (volumes[i] || 0));
  
  let posFlow = 0;
  let negFlow = 0;
  
  const start = Math.max(1, tp.length - period);
  for (let i = start; i < tp.length; i++) {
    if (tp[i] > tp[i - 1]) posFlow += rmf[i];
    else if (tp[i] < tp[i - 1]) negFlow += rmf[i];
  }
  
  if (negFlow === 0) return 100;
  const mfr = posFlow / negFlow;
  return 100 - (100 / (1 + mfr));
}

export function detectDivergence(prices: number[], rsiValues: number[]) {
  if (prices.length < 20) return "NEUTRO";
  
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 10]; // Comparação simplificada 10 períodos atrás
  const currentRSI = rsiValues[rsiValues.length - 1];
  const prevRSI = rsiValues[rsiValues.length - 10];
  
  // Bullish Divergence: Preço caindo, RSI subindo
  if (currentPrice < prevPrice && currentRSI > prevRSI && currentRSI < 40) {
    return "BULLISH DIV";
  }
  
  // Bearish Divergence: Preço subindo, RSI caindo
  if (currentPrice > prevPrice && currentRSI < prevRSI && currentRSI > 60) {
    return "BEARISH DIV";
  }
  
  return "NEUTRO";
}
