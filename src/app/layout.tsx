import type { Metadata, Viewport } from 'next';
import './globals.css';
import { app } from '@/literals';

export const metadata: Metadata = {
  title: app.nombre,
  description: app.descripcion,
  manifest: '/manifest.webmanifest',
  applicationName: app.nombre,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: app.nombre,
    // Cada splash se declara con la media query del dispositivo al que
    // corresponde. iOS solo muestra el splash si encuentra una imagen cuyo
    // media encaje EXACTAMENTE con el del terminal; sin coincidencia, en su
    // lugar se ve negro mientras carga el arranque en modo standalone.
    // Las dimensiones son las lógicas (px de imagen / densidad), porque
    // `device-width` y `device-height` se miden en puntos CSS, no en píxeles.
    // Se ordenan de menor a mayor ancho lógico para que se demi más fácil.
    startupImage: [
      {
        url: '/splash-1125_2436.png',
        media:
          '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash-1170_2532.png',
        media:
          '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        // iPhone 15, 15 Pro, 16, 14 Pro
        url: '/splash-1179_2556.png',
        media:
          '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        // iPhone 17, 17 Pro, 16 Pro
        url: '/splash-1206_2622.png',
        media:
          '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash-828_1792.png',
        media:
          '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        // iPhone XS Max, 11 Pro Max
        url: '/splash-1242_2688.png',
        media:
          '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        // iPhone Air
        url: '/splash-1260_2736.png',
        media:
          '(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
        url: '/splash-1284_2778.png',
        media:
          '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        // iPhone 14 Pro Max, 15 Plus, 15 Pro Max
        url: '/splash-1290_2796.png',
        media:
          '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        // iPhone 17 Pro Max, 16 Pro Max
        url: '/splash-1320_2868.png',
        media:
          '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B3D66',
  // Permite que el layout se extienda bajo el notch y la barra de gestos:
  // sin esto `env(safe-area-inset-*)` resuelve a 0 y el padding inferior de
  // la barra de navegación no reserva el espacio de la home indicator.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}