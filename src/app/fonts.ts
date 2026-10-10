import { Archivo, Archivo_Black } from 'next/font/google';

export const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

export const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
});
