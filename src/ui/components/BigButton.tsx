import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Tone = 'primary' | 'secondary' | 'ghost';

const tones: Record<Tone, string> = {
  primary: 'bg-orange-500 text-white border-orange-700 hover:bg-orange-400',
  secondary: 'bg-sky-400 text-white border-sky-600 hover:bg-sky-300',
  ghost: 'bg-white text-gray-700 border-orange-200 hover:bg-orange-50',
};

export function BigButton({
  children,
  tone = 'primary',
  className = '',
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }>) {
  return (
    <button
      className={`font-display text-2xl font-semibold px-8 py-4 rounded-full border-b-4 active:translate-y-1 active:border-b-0 transition select-none ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
