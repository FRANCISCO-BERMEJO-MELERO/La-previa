import { render, screen } from '@testing-library/react';
import { create } from 'qrcode';
import { describe, expect, it } from 'vitest';
import { QrCode, qrPath } from './QrCode';

const url = 'https://laprevia.app/sala/KTRM';

describe('qrPath', () => {
  it('dibuja un cuadrado por cada módulo oscuro del QR', () => {
    const { modules } = create(url, { errorCorrectionLevel: 'M' });
    const dark = Array.from(modules.data).filter(Boolean).length;
    const { path } = qrPath(url);
    expect(path.match(/M/g)).toHaveLength(dark);
  });

  it('deja un margen de cuatro módulos alrededor', () => {
    const { modules } = create(url, { errorCorrectionLevel: 'M' });
    expect(qrPath(url).size).toBe(modules.size + 8);
    expect(qrPath(url).path.startsWith('M4 4h1v1h-1z')).toBe(true);
  });

  it('cambia si cambia el enlace', () => {
    expect(qrPath(url).path).not.toBe(qrPath('https://laprevia.app/sala/ABCD').path);
  });
});

describe('QrCode', () => {
  it('es una imagen con nombre accesible', () => {
    render(<QrCode value={url} label="Código QR para entrar en la sala KTRM" />);
    expect(
      screen.getByRole('img', { name: 'Código QR para entrar en la sala KTRM' }),
    ).toBeInTheDocument();
  });
});
