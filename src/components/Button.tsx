import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'press h-16 rounded-button bg-tomato px-6 font-display text-xl uppercase shadow-hard',
  secondary: 'h-12 rounded-control bg-paper px-4 text-md font-bold',
  accent: 'h-14 rounded-control bg-sky px-5 font-display text-lg uppercase',
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  ...rest
}: ButtonProps) {
  const width = fullWidth ? 'w-full' : '';
  return (
    <button
      type={type}
      className={`inline-flex min-w-0 items-center justify-center gap-2 border-3 border-ink text-center text-ink disabled:cursor-not-allowed disabled:border-dashed disabled:bg-ground-soft disabled:shadow-none ${variantClasses[variant]} ${width}`}
      {...rest}
    />
  );
}
