import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

// Paleta de docs/CONTEXTO.md §8.
const verbena = {
  ground: '#ffd23f',
  ink: '#111111',
  paper: '#ffffff',
  tomato: '#ff6b5e',
  sky: '#7fd8ff',
  lime: '#b8f28a',
  lilac: '#d9b8ff',
  orange: '#ffb36b',
  'ground-soft': '#ffe98f',
  field: '#fff6d6',
  'field-error': '#ffe1de',
} as const;

describe('tokens de Verbena', () => {
  it.each(Object.entries(verbena))('define el color %s como %s', (name, value) => {
    expect(css).toContain(`--color-${name}: ${value};`);
  });

  it('anula la paleta, las sombras y los radios por defecto de Tailwind', () => {
    expect(css).toContain('--color-*: initial;');
    expect(css).toContain('--shadow-*: initial;');
    expect(css).toContain('--radius-*: initial;');
  });

  it('define sombras duras sin desenfoque', () => {
    expect(css).toContain('--shadow-hard: 6px 6px 0 var(--color-ink);');
    expect(css).toContain('--shadow-hard-lg: 8px 8px 0 var(--color-ink);');
    expect(css).toContain('--shadow-hard-lg-tomato: 8px 8px 0 var(--color-tomato);');
  });

  it('respeta prefers-reduced-motion en el hundido de los botones', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*transition: none;/);
  });
});

// Contraste WCAG 2.1: luminancia relativa de un color sRGB en hexadecimal.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('contraste de la paleta (AA, 4,5:1)', () => {
  const backgrounds = Object.entries(verbena).filter(([name]) => name !== 'ink');

  it.each(backgrounds)('el texto ink se lee sobre %s', (_, background) => {
    expect(contrast(verbena.ink, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto blanco y el titular ground se leen sobre ink', () => {
    expect(contrast(verbena.paper, verbena.ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(verbena.ground, verbena.ink)).toBeGreaterThanOrEqual(4.5);
  });
});
