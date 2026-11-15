import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, verificarToken } from '@/lib/session/token';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verificarToken(token) : null;

  // Las dos áreas de cuenta viven bajo su segmento ([cuenta]): /conjunta/...
  // e /individual/....
  const isDashboard =
    request.nextUrl.pathname.startsWith('/conjunta') ||
    request.nextUrl.pathname.startsWith('/individual');

  // Rutas protegidas: redirigir a login si no hay sesión.
  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Si hay sesión y va a login/signup, ir al selector de cuenta ("/").
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
  matcher: [
    '/conjunta/:path*',
    '/individual/:path*',
    '/login',
    '/signup',
  ],
};