import type { ReactNode } from 'react';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { copy } from '@/lib/copy';

type StatusScreenProps = {
  title: string;
  text?: string;
  /** Acción para salir del estado, como volver al inicio o reintentar. */
  action?: ReactNode;
};

/** Cargando, sala inexistente o error: mismo estilo que el resto de pantallas. */
export function StatusScreen({ title, text, action }: StatusScreenProps) {
  return (
    <Screen brand={copy.brand}>
      <div className="flex flex-1 flex-col justify-center gap-5">
        <Card variant="hero" tilt="left">
          <h1 className="font-display text-display-sm uppercase">{title}</h1>
          {text ? <p className="text-lead font-medium">{text}</p> : null}
        </Card>
      </div>
      {action}
    </Screen>
  );
}
