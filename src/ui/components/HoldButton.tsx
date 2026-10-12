import { useEffect, useRef, useState } from 'react';
import { config } from '../../engine/config';

/** Parent gate: press and hold for 3 seconds. Children tap; parents hold. */
export function HoldButton({ children, onHeld, className = '' }: { children: React.ReactNode; onHeld: () => void; className?: string }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useRef(0);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  };
  const begin = () => {
    start.current = Date.now();
    stop();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start.current) / config.parentGate.holdMs);
      setProgress(p);
      if (p >= 1) {
        stop();
        onHeld();
      }
    }, 50);
  };
  useEffect(() => stop, []);

  return (
    <button
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative overflow-hidden select-none touch-none ${className}`}
    >
      <span className="absolute inset-y-0 left-0 bg-indigo-200/60" style={{ width: `${progress * 100}%` }} />
      <span className="relative">{children}</span>
    </button>
  );
}
