import type { ReactNode } from 'react';

type WaitingBoxProps = {
  children: ReactNode;
};

export function WaitingBox({ children }: WaitingBoxProps) {
  return (
    <p
      role="status"
      className="flex min-h-16 items-center justify-center rounded-button border-3 border-dashed border-ink px-4 text-center text-base font-bold"
    >
      {children}
    </p>
  );
}
