import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { archivo, archivoBlack } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Previa',
  description: 'Juegos de fiesta para jugar en persona, cada uno con su móvil. Sin registro.',
};

// Debe coincidir con --color-ground de globals.css.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffd23f',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${archivo.variable} ${archivoBlack.variable}`}>
      <body className="min-h-dvh bg-ground font-sans font-medium text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
