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
