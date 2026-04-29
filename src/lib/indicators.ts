
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
  const upMoves: number[] = [];
  const downMoves: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    upMoves.push(upMove > downMove && upMove > 0 ? upMove : 0);
    downMoves.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  // Simplified ADX/DI calculation for performance
  const plusDI = upMoves.slice(-period).reduce((a, b) => a + b, 0) / period;
  const minusDI = downMoves.slice(-period).reduce((a, b) => a + b, 0) / period;
  const sum = plusDI + minusDI;
  const adx = sum === 0 ? 0 : (Math.abs(plusDI - minusDI) / sum) * 100;
  return { adx, plusDI, minusDI };
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
