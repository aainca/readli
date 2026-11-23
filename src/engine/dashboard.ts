import { SKILLS, type Level, type SkillId } from '../content/schema';
import { config } from './config';
import { dayKey, evaluateMastery, isCleanRead, type AttemptLike, type MasteryReport } from './mastery';

/**
 * Dashboard statistics from the attempt log. Pure.
 */
export interface DashAttempt extends AttemptLike {
  word: string;
  skillId: SkillId;
  level: Level;
  helpStep: number;
  overrideUsed?: boolean;
  panelOn?: boolean;
  stars?: number;
}

export interface LevelStats {
  skillId: SkillId;
  level: Level;
  attempts: number;
  cleanReads: number;
  /** All-time first-try accuracy. */
  accuracy: number;
  /** Accuracy with the rule panel on and off, when both exist. */
  panelOnAccuracy: number | null;
  panelOffAccuracy: number | null;
  report: MasteryReport;
  status: 'mastered' | 'current' | 'locked' | 'placed-out' | 'not started';
}

function practiceOnly(attempts: DashAttempt[]): DashAttempt[] {
  return attempts.filter((a) => a.mode === undefined || a.mode === 'practice');
}

function acc(list: AttemptLike[]): number | null {
  if (list.length === 0) return null;
  return list.filter(isCleanRead).length / list.length;
}

export function levelStats(
  attempts: DashAttempt[],
  currentLevels: Partial<Record<SkillId, Level>>,
  mastered: Partial<Record<SkillId, Level[]>>,
  placedOut: Partial<Record<SkillId, Level[]>>,
): LevelStats[] {
  const practice = practiceOnly(attempts);
  const out: LevelStats[] = [];
  for (const skillId of Object.keys(SKILLS) as SkillId[]) {
    const meta = SKILLS[skillId];
    if (meta.shipsIn !== 'v1') continue;
    const current = currentLevels[skillId] ?? meta.levels[0]!;
    for (const level of meta.levels) {
      const list = practice.filter((a) => a.skillId === skillId && a.level === level);
      const clean = list.filter(isCleanRead).length;
      const idx = meta.levels.indexOf(level);
      const curIdx = meta.levels.indexOf(current);
      let status: LevelStats['status'];
      if ((mastered[skillId] ?? []).includes(level)) status = 'mastered';
      else if ((placedOut[skillId] ?? []).includes(level)) status = 'placed-out';
      else if (idx === curIdx) status = 'current';
      else if (idx > curIdx) status = 'locked';
      else status = list.length ? 'mastered' : 'not started';
      out.push({
        skillId, level, attempts: list.length, cleanReads: clean,
        accuracy: list.length ? clean / list.length : 0,
        panelOnAccuracy: acc(list.filter((a) => a.panelOn === true)),
        panelOffAccuracy: acc(list.filter((a) => a.panelOn === false)),
        report: evaluateMastery(list),
        status,
      });
    }
  }
  return out;
}

export interface TrickyWord {
  word: string;
  skillId: SkillId;
  level: Level;
  attempts: number;
  misses: number;
  /** misses / attempts */
  missRate: number;
  lastSeen: number;
}

/** Words missed most often, with at least `minAttempts` tries. */
export function trickiestWords(attempts: DashAttempt[], limit = 15, minAttempts = 2): TrickyWord[] {
  const byWord = new Map<string, TrickyWord>();
  for (const a of practiceOnly(attempts)) {
    const t = byWord.get(a.word) ?? { word: a.word, skillId: a.skillId, level: a.level, attempts: 0, misses: 0, missRate: 0, lastSeen: 0 };
    t.attempts += 1;
    if (!isCleanRead(a)) t.misses += 1;
    t.lastSeen = Math.max(t.lastSeen, a.timestamp);
    byWord.set(a.word, t);
  }
  return [...byWord.values()]
    .filter((t) => t.attempts >= minAttempts && t.misses > 0)
    .map((t) => ({ ...t, missRate: t.misses / t.attempts }))
    .sort((a, b) => b.misses - a.misses || b.missRate - a.missRate || b.lastSeen - a.lastSeen)
    .slice(0, limit);
}

/* ---------- practice time ---------- */

/** Attempts closer together than this belong to the same sitting. */
const SESSION_GAP_MS = 10 * 60 * 1000;
/** A sitting is at least this long (one word is never zero minutes). */
const MIN_SESSION_MS = 60 * 1000;

export interface Sitting {
  start: number;
  end: number;
  attempts: number;
  minutes: number;
}

export function sittings(attempts: AttemptLike[]): Sitting[] {
  const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
  const out: Sitting[] = [];
  for (const a of sorted) {
    const last = out[out.length - 1];
    if (last && a.timestamp - last.end <= SESSION_GAP_MS) {
      last.end = a.timestamp;
      last.attempts += 1;
    } else {
      out.push({ start: a.timestamp, end: a.timestamp, attempts: 1, minutes: 0 });
    }
  }
  for (const s of out) s.minutes = Math.max(MIN_SESSION_MS, s.end - s.start) / 60000;
  return out;
}

/** ISO-like week key: the Monday that starts the week, as a day key. */
export function weekKey(timestamp: number): string {
  const d = new Date(timestamp);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return dayKey(d.getTime());
}

export interface WeekStats {
  week: string;
  days: number;
  minutes: number;
  attempts: number;
}

export function weeklyPractice(attempts: AttemptLike[], weeks = 8, now = Date.now()): WeekStats[] {
  const byWeek = new Map<string, { days: Set<string>; minutes: number; attempts: number }>();
  for (const s of sittings(attempts)) {
    const k = weekKey(s.start);
    const w = byWeek.get(k) ?? { days: new Set<string>(), minutes: 0, attempts: 0 };
    w.days.add(dayKey(s.start));
    w.minutes += s.minutes;
    w.attempts += s.attempts;
    byWeek.set(k, w);
  }
  const out: WeekStats[] = [];
  const cursor = new Date(now);
  for (let i = 0; i < weeks; i++) {
    const k = weekKey(cursor.getTime());
    const w = byWeek.get(k);
    out.push({ week: k, days: w?.days.size ?? 0, minutes: Math.round(w?.minutes ?? 0), attempts: w?.attempts ?? 0 });
    cursor.setDate(cursor.getDate() - 7);
  }
  return out;
}

/** Whether the dashboard should suggest a retest. */
export function retestDue(lastPlacementAt: number | undefined, now = Date.now()): boolean {
  if (!lastPlacementAt) return false;
  return now - lastPlacementAt >= config.placement.retestWeeks * 7 * 24 * 60 * 60 * 1000;
}
