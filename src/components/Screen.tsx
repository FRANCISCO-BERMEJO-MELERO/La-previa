import type { ReactNode } from 'react';

type ScreenProps = {
  brand: string;
  /** Lo que va a la derecha de la cabecera, normalmente una `Pill`. */
  aside?: ReactNode;
  /** Aviso bajo la cabecera, como el de conexión perdida. */
  notice?: ReactNode;
  /** Pantallas sin cabecera, como la de inicio. */
  bare?: boolean;
  children: ReactNode;
};

export function Screen({ brand, aside, notice, bare = false, children }: ScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-6 pt-7 pb-6">
      {bare ? null : (
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-title uppercase">{brand}</p>
          {aside}
        </header>
      )}
      {notice}
      <main className="flex flex-1 flex-col gap-5">{children}</main>
    </div>
  );
}
