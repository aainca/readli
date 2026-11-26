import { useEffect, useState } from 'react';
import { flag, type VisitorStats as Stats } from '../../engine/visitors';

const SESSION_KEY = 'visitCounted';

/** Records this browser's visit once per session. Silent on failure (local dev, offline). */
export function recordVisit(): void {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch { /* storage blocked: count anyway */ }
  void fetch('/.netlify/functions/visit', { method: 'POST', keepalive: true }).catch(() => {});
}

/** Footer section: unique readers and where they are. */
export function VisitorStatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    recordVisit();
    fetch('/.netlify/functions/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: Stats) => setStats(s))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!stats) return <div className="text-center text-xs text-slate-400 mt-8">counting readers…</div>;

  return (
    <section className="mt-8 bg-white/70 border border-sky-100 rounded-3xl p-4 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">readers of this site</div>
      <div className="font-display text-3xl text-sky-900">
        👀 {stats.uniqueVisitors.toLocaleString()} {stats.uniqueVisitors === 1 ? 'reader' : 'readers'}
        {stats.visitsToday > 0 && <span className="text-base text-slate-500 ml-2">· {stats.visitsToday} today</span>}
      </div>
      {stats.countries.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {stats.countries.slice(0, 8).map((c) => (
            <span key={c.code} className="bg-sky-50 border border-sky-100 rounded-full px-3 py-1 text-sm font-bold text-slate-700" title={c.name}>
              {flag(c.code)} {c.name} · {c.visitors}
            </span>
          ))}
        </div>
      )}
      {stats.cities.length > 0 && (
        <div className="text-xs text-slate-500 mt-2">{stats.cities.slice(0, 5).map((c) => `${c.label} (${c.visitors})`).join(' · ')}</div>
      )}
      <div className="text-[11px] text-slate-400 mt-2">
        {stats.firstDay ? `since ${new Date(stats.firstDay).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ` : ''}
        no cookies, no tracking: one anonymous count per device, placed by country
      </div>
    </section>
  );
}
