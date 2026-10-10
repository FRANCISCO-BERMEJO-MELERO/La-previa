type OfflineNoticeProps = {
  children: string;
};

/** Aviso de conexión perdida: no bloquea la pantalla, que sigue mostrando la última foto. */
export function OfflineNotice({ children }: OfflineNoticeProps) {
  return (
    <p
      role="status"
      className="rounded-chip border-3 border-dashed border-ink bg-orange px-3.5 py-2 text-sm font-bold"
    >
      {children}
    </p>
  );
}
