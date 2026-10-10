import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

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

function buttonClasses(variant: ButtonVariant, fullWidth: boolean): string {
  const width = fullWidth ? 'w-full' : '';
  return `inline-flex min-w-0 items-center justify-center gap-2 border-3 border-ink text-center text-ink disabled:cursor-not-allowed disabled:border-dashed disabled:bg-ground-soft disabled:shadow-none ${variantClasses[variant]} ${width}`;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, fullWidth)} {...rest} />;
}

type LinkButtonProps = {
  href: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
};

/** Enlace con aspecto de botón, para navegar. */
export function LinkButton({
  href,
  variant = 'primary',
  fullWidth = false,
  children,
}: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses(variant, fullWidth)}>
      {children}
    </Link>
  );
}
