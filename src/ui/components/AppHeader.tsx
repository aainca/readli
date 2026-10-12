import { StarIcon } from './StarIcon';

export interface AppHeaderProps {
  stars: number;
  streak: number;
  onOpenGuide: () => void;
  onOpenAudio: () => void;
}

/** Sticky header from the prototype: logo, title, star and streak counters, rules guide. */
export function AppHeader({ stars, streak, onOpenGuide, onOpenAudio }: AppHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-sky-100 shadow-sm px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-400 to-amber-300 text-amber-100 p-2.5 rounded-2xl shadow-md flex items-center justify-center">
            <StarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-sky-900 tracking-wide leading-none">Vowel Mastery</h1>
            <p className="text-xs text-sky-600 font-bold">read the word, earn stars</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Counter label="Stars" value={stars} tone="amber" icon={<StarIcon className="w-5 h-5 text-amber-500" />} />
          <Counter label="Streak" value={streak} tone="orange" icon={<span className="text-lg leading-none">🔥</span>} />
          <button
            onClick={onOpenAudio}
            className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-2.5 rounded-2xl text-sm font-display font-semibold shadow-sm transition flex items-center gap-2"
            title="Audio setup"
          >
            <span aria-hidden>🎧</span>
            <span className="hidden sm:inline">Audio</span>
          </button>
          <button
            onClick={onOpenGuide}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2.5 rounded-2xl text-sm font-display font-semibold shadow-md transition flex items-center gap-2"
          >
            <span aria-hidden>📖</span>
            <span className="hidden sm:inline">7 Rules Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Counter({ label, value, tone, icon }: { label: string; value: number; tone: 'amber' | 'orange'; icon: React.ReactNode }) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  };
  const strong = tone === 'amber' ? 'text-amber-800' : 'text-orange-800';
  return (
    <div className={`border px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm ${tones[tone]}`}>
      {icon}
      <div className="text-left">
        <span className="block text-[10px] font-extrabold leading-tight uppercase">{label}</span>
        <span className={`font-display font-bold text-lg leading-none ${strong}`}>{value}</span>
      </div>
    </div>
  );
}
