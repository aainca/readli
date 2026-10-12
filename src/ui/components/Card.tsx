import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Card({ children, className = '', ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`rounded-3xl bg-white shadow-[0_6px_0_rgba(0,0,0,0.06)] border-2 border-orange-100 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
