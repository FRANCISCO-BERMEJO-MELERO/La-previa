import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RootLayout, { metadata, viewport } from './layout';

vi.mock('./fonts', () => ({
  archivo: { variable: 'font-archivo' },
  archivoBlack: { variable: 'font-archivo-black' },
}));

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('RootLayout', () => {
  it('declara el idioma español y carga las dos fuentes', () => {
    const html = renderToStaticMarkup(<RootLayout>contenido</RootLayout>);
    expect(html).toContain('lang="es"');
    expect(html).toContain('font-archivo font-archivo-black');
  });

  it('usa el color de fondo de Verbena como color de tema', () => {
    const ground = /--color-ground: (#[0-9a-f]{6});/.exec(css)?.[1];
    expect(ground).toBeDefined();
    expect(viewport.themeColor).toBe(ground);
  });

  it('se adapta al ancho del móvil', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
  });

  it('tiene título', () => {
    expect(metadata.title).toBe('La Previa');
  });
});
