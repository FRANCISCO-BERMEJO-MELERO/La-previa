import { create } from 'qrcode';

const QUIET_ZONE = 4;

/** Trazado SVG del QR: un cuadrado de 1×1 por cada módulo oscuro, con margen de silencio. */
export function qrPath(text: string): { path: string; size: number } {
  const { modules } = create(text, { errorCorrectionLevel: 'M' });
  const squares: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) {
        squares.push(`M${String(col + QUIET_ZONE)} ${String(row + QUIET_ZONE)}h1v1h-1z`);
      }
    }
  }
  return { path: squares.join(''), size: modules.size + QUIET_ZONE * 2 };
}

type QrCodeProps = {
  value: string;
  label: string;
};

export function QrCode({ value, label }: QrCodeProps) {
  const { path, size } = qrPath(value);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      shapeRendering="crispEdges"
      className="aspect-square w-full rounded-control border-3 border-ink bg-paper"
    >
      <path d={path} className="fill-ink" />
    </svg>
  );
}
