import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE, SESSION_MAX_AGE,
  checkPassword, createSessionValue, isAuthenticated, loginConfigured,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

// Freio contra força bruta: 10 erros por IP a cada 15 min. Em memória por instância —
// não é perfeito no serverless, mas soma com o atraso por erro e a senha forte.
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 10;
const failures = new Map<string, { count: number; first: number }>();

function clientIp(request: NextRequest): string {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

// Estado da sessão — o cookie é HttpOnly, então o front pergunta aqui se já está logado
export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAuthenticated(request) });
}

export async function POST(request: NextRequest) {
  if (!loginConfigured()) {
    return NextResponse.json({ error: 'Login não configurado no servidor.' }, { status: 503 });
  }

  const ip = clientIp(request);
  const now = Date.now();
  const f = failures.get(ip);
  if (f && now - f.first < FAIL_WINDOW_MS && f.count >= FAIL_MAX) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 });
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch { /* corpo inválido = senha vazia */ }

  if (!password || !checkPassword(password)) {
    const cur = f && now - f.first < FAIL_WINDOW_MS ? f : { count: 0, first: now };
    failures.set(ip, { count: cur.count + 1, first: cur.first });
    await new Promise(r => setTimeout(r, 600));
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  failures.delete(ip);
  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
