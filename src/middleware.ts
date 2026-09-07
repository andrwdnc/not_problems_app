import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, verificarToken } from '@/lib/session/token';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verificarToken(token) : null;

  const isDashboard =
    request.nextUrl.pathname.startsWith('/inicio') ||
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