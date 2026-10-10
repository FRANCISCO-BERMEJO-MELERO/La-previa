import type { ReactNode } from 'react';
import { Screen } from '@/components/Screen';
import { copy } from '@/lib/copy';

export type GameScreenProps = {
  /** Píldora de la cabecera, que sirve para salir de la sala. */
  aside: ReactNode;
  /** Aviso de conexión perdida, si lo hay. */
  notice: ReactNode;
  /** Botón del anfitrión o caja de espera, al pie. */
  footer: ReactNode;
};

/** Marco común de las pantallas de partida. */
export function GameScreen({
  aside,
  notice,
  footer,
  children,
}: GameScreenProps & { children: ReactNode }) {
  return (
    <Screen brand={copy.brand} aside={aside} notice={notice}>
      {children}
      <div className="mt-auto flex flex-col gap-3">{footer}</div>
    </Screen>
  );
}
