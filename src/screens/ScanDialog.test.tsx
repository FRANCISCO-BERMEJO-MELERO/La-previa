import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Frame, ScanDeps } from '@/lib/qr-camera';
import { ScanDialog } from './ScanDialog';

const frame: Frame = { data: new Uint8ClampedArray(4), width: 1, height: 1 };

/** Cámara de mentira que lee, uno tras otro, los textos dados. */
function fakeDeps(reads: (string | null)[], openCamera?: ScanDeps['openCamera']) {
  const stop = vi.fn();
  const attach = vi.fn();
  const queue = [...reads];
  const deps: ScanDeps = {
    openCamera: openCamera ?? (() => Promise.resolve({ attach, stop })),
    readFrame: () => frame,
    loadDecoder: () => Promise.resolve(() => queue.shift() ?? null),
  };
  return { deps, stop, attach };
}

function open(deps: ScanDeps, onCode = vi.fn<(code: string) => void>()) {
  const view = render(<ScanDialog open onClose={vi.fn()} onCode={onCode} deps={deps} />);
  return { ...view, onCode };
}

describe('ScanDialog', () => {
  it('abre la cámara, lee el QR de una sala y avisa con su código', async () => {
    const { deps, attach } = fakeDeps([null, 'https://la-previa.vercel.app/sala/KTRM']);
    const { onCode } = open(deps);
    expect(screen.getByRole('status')).toHaveTextContent('Abriendo la cámara…');
    await waitFor(() => {
      expect(onCode).toHaveBeenCalledWith('KTRM');
    });
    expect(attach).toHaveBeenCalledTimes(1);
    expect(onCode).toHaveBeenCalledTimes(1);
  });

  it('si el QR no es de una sala, lo dice y sigue buscando', async () => {
    const { deps } = fakeDeps(['https://example.com', 'KTRM']);
    const { onCode } = open(deps);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Ese QR no es de una sala');
    });
    await waitFor(() => {
      expect(onCode).toHaveBeenCalledWith('KTRM');
    });
  });

  it('sin permiso de cámara lo explica y deja escribir el código', async () => {
    const { deps } = fakeDeps([], () =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    );
    open(deps);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'No tenemos permiso para usar la cámara',
      );
    });
  });

  it('sin cámara usable lo explica', async () => {
    const { deps } = fakeDeps([], () => Promise.reject(new TypeError('mediaDevices')));
    open(deps);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('No podemos usar la cámara');
    });
  });

  it('al cerrar el diálogo apaga la cámara', async () => {
    const { deps, stop, attach } = fakeDeps([]);
    const { rerender } = open(deps);
    await waitFor(() => {
      expect(attach).toHaveBeenCalled();
    });
    rerender(<ScanDialog open={false} onClose={vi.fn()} onCode={vi.fn()} deps={deps} />);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
