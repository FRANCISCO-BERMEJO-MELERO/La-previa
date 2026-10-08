type PillButtonTone = 'paper' | 'tomato';

type PillButtonProps = {
  tone?: PillButtonTone;
  tilted?: boolean;
  label: string;
  /** Lo que hace al pulsarla, para lectores de pantalla; el nombre empieza por el texto visible. */
  hint: string;
  onClick: () => void;
};

const toneClasses: Record<PillButtonTone, string> = {
  paper: 'bg-paper',
  tomato: 'bg-tomato',
};

/** Píldora de cabecera pulsable. El botón mide 44 px de alto aunque la píldora se vea más baja. */
export function PillButton({
  tone = 'paper',
  tilted = false,
  label,
  hint,
  onClick,
}: PillButtonProps) {
  return (
    <button
      type="button"
      aria-label={`${label}. ${hint}`}
      aria-haspopup="dialog"
      onClick={onClick}
      className="-my-2 flex min-h-11 items-center rounded-full"
    >
      <span
        className={`inline-flex items-center rounded-full border-3 border-ink px-3 py-1 text-label font-bold text-ink ${toneClasses[tone]} ${tilted ? 'tilt-pill-left' : ''}`}
      >
        {label}
      </span>
    </button>
  );
}
