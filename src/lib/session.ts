import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

// Sessão do painel: a senha vive só no servidor (CRYPTO_PASSWORD, sem NEXT_PUBLIC_) e o
// navegador recebe um cookie HttpOnly assinado — o JS do cliente nunca vê a senha nem o cookie.
export const SESSION_COOKIE = 'sentinela_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Chave de assinatura derivada da senha + token do sync: trocar a senha invalida todas as sessões.
function signingKey(): string | null {
  const pwd = (process.env.CRYPTO_PASSWORD || '').trim();
  const tok = (process.env.SYNC_AUTH_TOKEN || '').trim();
  if (!pwd || !tok) return null;
  return `${tok}:${pwd}`;
}

// Comparação em tempo constante (hash primeiro p/ não vazar o tamanho do segredo)
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function loginConfigured(): boolean {
  return signingKey() !== null;
}

export function checkPassword(pwd: string): boolean {
  const expected = (process.env.CRYPTO_PASSWORD || '').trim();
  if (!expected) return false;
  return safeEqual(pwd, expected);
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex');
}

export function createSessionValue(): string {
  const key = signingKey();
  if (!key) throw new Error('Login não configurado');
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  return `${exp}.${sign(`v1.${exp}`, key)}`;
}

export function isAuthenticated(request: NextRequest): boolean {
  const key = signingKey();
  if (!key) return false;
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  const [expStr, sig] = raw.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return safeEqual(sig, sign(`v1.${exp}`, key));
}
