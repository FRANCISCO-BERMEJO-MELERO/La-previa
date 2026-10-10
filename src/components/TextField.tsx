import type { InputHTMLAttributes } from 'react';

type TextFieldVariant = 'text' | 'code';

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> & {
  id: string;
  label: string;
  variant?: TextFieldVariant;
  /** Mensaje en lenguaje llano; si existe, el campo se marca como erróneo. */
  error?: string;
};

const variantClasses: Record<TextFieldVariant, string> = {
  text: 'h-16 px-4 text-2xl font-bold',
  code: 'h-18 text-center font-display text-4xl uppercase tracking-code',
};

export function TextField({ id, label, variant = 'text', error, ...rest }: TextFieldProps) {
  const errorId = `${id}-error`;
  const background = error ? 'bg-field-error' : 'bg-field';
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-label font-bold uppercase tracking-label">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full min-w-0 rounded-control border-3 border-ink text-ink ${background} ${variantClasses[variant]}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-md font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
