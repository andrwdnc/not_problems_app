/**
 * @type {import('next').NextConfig}
 */

/**
 * Cabeceras de seguridad.
 *
 * Esta aplicación no carga recursos de terceros: no hay fuentes externas, ni
 * imágenes remotas, ni analítica. Todo lo que sirve el navegador es de origen
 * propio (`/public`) o lo inyecta Next desde el bundle. Eso permite una CSP
 * bastante cerrada, que es el punto: una lista de dominios permitidos que
 * incluye `*` no aporta seguridad, solo documentación.
 *
 * `script-src` conserva `'unsafe-inline'` porque el App Router de Next 14
 * inyecta scripts en línea para hidratar el payload de RSC. Quitarlo exige
 * nonces por request propagados desde el middleware; queda anotado como
 * deuda en `docs/security.md`.
 */

/** Directivas comunes a desarrollo y producción. */
const CSP_BASE = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  // Ningún iframe puede embeber la app (clickjacking).
  "frame-ancestors 'none'",
  // Sin <object>/<embed>: por defecto solo se permite lo que se declare.
  "object-src 'none'",
  // Icons de Lucide y el anillo de progreso son SVG en línea, no imágenes.
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
];

/**
 * CSP de producción. `upgrade-insecure-requests` fuerza HTTPS para cualquier
 * subrecurso que se hubiera colado por HTTP.
 */
const CSP_PRODUCCION = [
  ...CSP_BASE,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * CSP de desarrollo. Next necesita `eval` para el Fast Refresh y un WebSocket
 * para el HMR; sin estas dos directivas el dev server no recarga los cambios.
 */
const CSP_DESARROLLO = [
  ...CSP_BASE,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' ws: wss:",
].join('; ');

const esProduccion = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Detecta efectos colaterales en desarrollo (doble render, efectos sucios)
  // que en producción pasan desapercibidos. Cuesta algo de CPU en dev.
  reactStrictMode: true,

  // No anunciar el framework en cada respuesta: no aporta nada y delata la pila.
  poweredByHeader: false,

  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: esProduccion ? CSP_PRODUCCION : CSP_DESARROLLO,
          },
          // Evita que el navegador "adivine" un tipo distinto al declarado.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Refuerzo explícito de `frame-ancestors 'none'` para navegadores
          // antiguos que no interpretan la CSP.
          { key: 'X-Frame-Options', value: 'DENY' },
          // No se filtra la ruta completa a terceros; los enlaces salientes
          // solo llevan el origen.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // La app no usa cámara, micrófono ni geolocalización.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          ...(esProduccion
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;