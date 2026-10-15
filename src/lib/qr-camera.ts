/** Cámara y lectura de QR para el escáner del inicio. En los tests se sustituyen por dobles. */

export type Frame = { data: Uint8ClampedArray; width: number; height: number };

export type Camera = {
  attach: (video: HTMLVideoElement) => void;
  stop: () => void;
};

export type ScanDeps = {
  openCamera: () => Promise<Camera>;
  readFrame: (video: HTMLVideoElement) => Frame | null;
  /** Carga el decodificador al abrir el escáner, para no pesar en la primera carga. */
  loadDecoder: () => Promise<(frame: Frame) => string | null>;
};

export type CameraFailure = 'denied' | 'unavailable';

// Para leer un QR sobra con 640 px; más solo gasta batería.
const MAX_SIDE = 640;

async function openCamera(): Promise<Camera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  return {
    attach: (video) => {
      video.srcObject = stream;
    },
    stop: () => {
      for (const track of stream.getTracks()) track.stop();
    },
  };
}

function readFrame(video: HTMLVideoElement): Frame | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

async function loadDecoder(): Promise<(frame: Frame) => string | null> {
  const { default: jsQR } = await import('jsqr');
  return (frame) => jsQR(frame.data, frame.width, frame.height)?.data ?? null;
}

export const defaultScanDeps: ScanDeps = { openCamera, readFrame, loadDecoder };

/** Sin permiso es algo que se puede arreglar; cualquier otro fallo es que no hay cámara usable. */
export function cameraFailure(error: unknown): CameraFailure {
  const denied =
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError');
  return denied ? 'denied' : 'unavailable';
}
