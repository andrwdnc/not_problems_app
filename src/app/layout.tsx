import type { Metadata } from 'next';
import './globals.css';
import { app } from '@/literals';

export const metadata: Metadata = {
  title: app.nombre,
  description: app.descripcion,
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