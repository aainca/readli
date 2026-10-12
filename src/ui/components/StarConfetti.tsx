import { useMemo } from 'react';

/** Falling star confetti. Render it while `active` and unmount to clear. */
export function StarConfetti({ count = 24 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 16 + Math.random() * 20,
        delay: Math.random() * 0.6,
        duration: 2 + Math.random() * 1.5,
        drift: (Math.random() - 0.5) * 200,
        color: ['#fbbf24', '#f97316', '#38bdf8', '#a78bfa', '#f472b6'][i % 5],
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {stars.map((s) => (
        <svg
          key={s.id}
          className="confetti-star"
          viewBox="0 0 24 24"
          width={s.size}
          height={s.size}
          style={{
            left: `${s.left}%`,
            ['--delay' as string]: `${s.delay}s`,
            ['--duration' as string]: `${s.duration}s`,
            ['--drift' as string]: `${s.drift}px`,
          }}
        >
          <path
            d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z"
            fill={s.color}
            stroke="#fff"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}
