import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Card({ children, className = '', ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-3xl bg-white card-shadow-lg border border-sky-100 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
