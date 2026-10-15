'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { copy } from '@/lib/copy';
import {
  cameraFailure,
  defaultScanDeps,
  type Camera,
  type CameraFailure,
  type ScanDeps,
} from '@/lib/qr-camera';
import { roomCodeFromScan } from '@/lib/scan';

type ScanStatus = 'starting' | 'scanning' | 'not_room' | CameraFailure;

const SCAN_EVERY_MS = 250;

type ScanDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Se ha leído el QR de una sala. */
  onCode: (code: string) => void;
  deps?: ScanDeps;
};

/** Diálogo con la cámara para leer el QR de una sala. */
export function ScanDialog({ open, onClose, onCode, deps = defaultScanDeps }: ScanDialogProps) {
  return (
    <Dialog open={open} title={copy.scan.title} closeLabel={copy.scan.close} onClose={onClose}>
      <Scanner onCode={onCode} deps={deps} />
    </Dialog>
  );
}

// Solo existe con el diálogo abierto: al cerrarlo se desmonta y apaga la cámara.
function Scanner({ onCode, deps }: { onCode: (code: string) => void; deps: ScanDeps }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ScanStatus>('starting');
  const found = useEffectEvent((code: string) => {
    onCode(code);
  });

  useEffect(() => {
    let camera: Camera | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const start = async () => {
      try {
        const [opened, decode] = await Promise.all([deps.openCamera(), deps.loadDecoder()]);
        camera = opened;
        const video = videoRef.current;
        if (stopped || !video) {
          opened.stop();
          return;
        }
        opened.attach(video);
        setStatus('scanning');
        timer = setInterval(() => {
          const frame = deps.readFrame(video);
          const text = frame ? decode(frame) : null;
          if (text === null) return;
          const code = roomCodeFromScan(text);
          if (!code) {
            setStatus('not_room');
            return;
          }
          clearInterval(timer);
          found(code);
        }, SCAN_EVERY_MS);
      } catch (error) {
        if (!stopped) setStatus(cameraFailure(error));
      }
    };
    void start();

    return () => {
      stopped = true;
      clearInterval(timer);
      camera?.stop();
    };
  }, [deps]);

  const failed = status === 'denied' || status === 'unavailable';
  return (
    <div className="flex flex-col gap-3">
      {failed ? null : (
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay
          muted
          playsInline
          className="aspect-square w-full rounded-control border-3 border-ink bg-ink object-cover"
        />
      )}
      <p role="status" className="text-md font-medium">
        {copy.scan.status[status]}
      </p>
    </div>
  );
}
