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
    startupImage: [
      '/splash-828_1792.png',
      '/splash-1125_2436.png',
      '/splash-1170_2532.png',
      '/splash-1242_2688.png',
      '/splash-1284_2778.png',
      '/splash-1290_2796.png',
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