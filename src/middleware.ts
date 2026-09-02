import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'auth_session';

/**
 * Verifica la cookie de sesión firmada (HMAC-SHA256) usando Web Crypto, que es
 * el runtime disponible en Edge (Middleware).
 */
async function sesionValida(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const partes = token.split('.');
  if (partes.length !== 3) return false;

  const [userId, expira, firma] = partes;
  const expMs = Number(expira);
  if (!Number.isFinite(expMs) || Date.now() >= expMs) return false;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const data = new TextEncoder().encode(`${userId}.${expira}`);
  const firmaBytes = base64urlToBytes(firma);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'HMAC',
      key,
      firmaBytes,
      data,
    );
  } catch {
    return false;
  }
}

function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = (await sesionValida(token)) ? true : false;

  const isDashboard = request.nextUrl.pathname.startsWith('/inicio') ||
    request.nextUrl.pathname.startsWith('/gastos') ||
    request.nextUrl.pathname.startsWith('/aportar') ||
    request.nextUrl.pathname.startsWith('/historico');

  // Rutas protegidas: redirigir a login si no hay sesión.
  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Si hay sesión y va a login/signup, ir a inicio.
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/inicio';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: [
    '/inicio/:path*',
    '/gastos/:path*',
    '/aportar/:path*',
    '/historico/:path*',
    '/login',
    '/signup',
  ],
};
