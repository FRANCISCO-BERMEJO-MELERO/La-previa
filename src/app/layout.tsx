import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { copy } from '@/lib/copy';
import { archivo, archivoBlack } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
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
