/** Shown when the app switched to parent-judged mode. Offers a retry and the audio setup. */
export function FallbackBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold rounded-2xl px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="flex-1">{message}</span>
      <span className="flex gap-2 shrink-0">
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-audio-setup'))} className="px-3 py-1 rounded-full bg-white border border-amber-300 text-amber-900">🎧 audio setup</button>
        <button onClick={onRetry} className="px-3 py-1 rounded-full bg-amber-400 border border-amber-500 text-amber-950">try the mic again</button>
      </span>
    </div>
  );
}
