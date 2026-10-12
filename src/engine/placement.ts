import { SET1_SKILL_IDS, SKILLS, type Level, type Set1SkillId, type Word } from '../content/schema';
import { config } from './config';
import { isCleanRead, type AttemptLike } from './mastery';
import { shuffle } from './session';

/**
 * Adaptive placement test. Pure: given the results so far, returns the next
 * probe or the final placement.
 *
 * Per group, in order 1.1 to 1.7: probe 4 words at Level 2 (or the group's
 * lowest level). 3 or 4 correct passes the level and moves up; 2 or fewer
 * fails it and moves down. Stop when the highest passed level is found.
 * The child starts each group at the first level he did not pass.
 * Six misses in a row end the test; untested groups start at Level 1.
 * At most 40 words. Groups the cap leaves unfinished are placed at the
 * typical level of the finished groups (never below what they earned) and
 * flagged as estimated, so the parent can see it and fast adjust can fix it.
 */
export interface PlacementEntry {
  skillId: Set1SkillId;
  level: Level;
  word: string;
  correct: boolean;
}

export interface Probe {
  kind: 'probe';
  skillId: Set1SkillId;
  level: Level;
  /** 0-based index of this word within the 4-word probe. */
  index: number;
  /** Total words answered so far. */
  answered: number;
}

export interface Placement {
  kind: 'done';
  /** Starting level per group. */
  levels: Record<Set1SkillId, Level>;
  /** Levels below the starting level, per group. */
  placedOut: Record<Set1SkillId, Level[]>;
  missedWords: string[];
  wordsTested: number;
  endedEarly: boolean;
  /** Groups the test never reached. After an early stop they start at Level 1. */
  untested: Set1SkillId[];
  /** Groups whose level is estimated from the others because the word cap was reached. */
  estimated: Set1SkillId[];
  strongest: Set1SkillId | null;
  weakest: Set1SkillId | null;
}

export type PlacementStep = Probe | Placement;

interface GroupStatus {
  passed: Level[];
  failed: Level[];
  /** Level currently being probed, or null when the group is settled. */
  probing: Level | null;
  probed: number;
  settled: boolean;
}

function levelsOf(skillId: Set1SkillId): readonly Level[] {
  return SKILLS[skillId].levels;
}

function startLevel(skillId: Set1SkillId): Level {
  const levels = levelsOf(skillId);
  const start = config.placement.startLevel as Level;
  return levels.includes(start) ? start : levels[0]!;
}

/** Replays a group's results to find its status. */
export function groupStatus(skillId: Set1SkillId, entries: PlacementEntry[]): GroupStatus {
  const levels = levelsOf(skillId);
  const own = entries.filter((e) => e.skillId === skillId);
  const passed: Level[] = [];
  const failed: Level[] = [];
  let level: Level | null = startLevel(skillId);
  let i = 0;
  const n = config.placement.wordsPerProbe;

  while (level !== null) {
    const chunk = own.slice(i, i + n);
    if (chunk.length < n) {
      return { passed, failed, probing: level, probed: chunk.length, settled: false };
    }
    i += n;
    const correct = chunk.filter((e) => e.correct).length;
    const idx = levels.indexOf(level);
    if (correct >= config.placement.passCount) {
      passed.push(level);
      const up = levels[idx + 1];
      if (up === undefined || failed.includes(up)) level = null;
      else level = up;
    } else {
      failed.push(level);
      const down = levels[idx - 1];
      if (down === undefined || passed.includes(down)) level = null;
      else level = down;
    }
  }
  return { passed, failed, probing: null, probed: 0, settled: true };
}

export function missStreak(entries: PlacementEntry[]): number {
  let n = 0;
  for (let i = entries.length - 1; i >= 0 && !entries[i]!.correct; i--) n++;
  return n;
}

function startingLevel(skillId: Set1SkillId, status: GroupStatus): Level {
  const levels = levelsOf(skillId);
  if (status.passed.length === 0) return levels[0]!;
  const top = Math.max(...status.passed.map((l) => levels.indexOf(l)));
  return levels[Math.min(top + 1, levels.length - 1)]!;
}

/** Position from the top of the group's level list: 0 = top level. Comparable across groups. */
function fromTop(id: Set1SkillId, level: Level): number {
  return levelsOf(id).length - 1 - levelsOf(id).indexOf(level);
}

function finish(entries: PlacementEntry[], endedEarly: boolean): Placement {
  const levels = {} as Record<Set1SkillId, Level>;
  const placedOut = {} as Record<Set1SkillId, Level[]>;
  const untested: Set1SkillId[] = [];
  const estimated: Set1SkillId[] = [];
  const statuses = new Map(SET1_SKILL_IDS.map((id) => [id, groupStatus(id, entries)] as const));
  const settled = SET1_SKILL_IDS.filter((id) => statuses.get(id)!.settled);

  // Typical distance from the top among settled groups (median, rounded toward the lower level:
  // placing too high discourages more than placing too low, and fast adjust corrects it).
  let typicalFromTop: number | null = null;
  if (!endedEarly && settled.length > 0) {
    const d = settled.map((id) => fromTop(id, startingLevel(id, statuses.get(id)!))).sort((a, b) => a - b);
    typicalFromTop = d[Math.ceil((d.length - 1) / 2)]!;
  }

  for (const id of SET1_SKILL_IDS) {
    const status = statuses.get(id)!;
    let start = startingLevel(id, status);
    if (!status.settled && typicalFromTop !== null) {
      const lv = levelsOf(id);
      const est = lv[Math.max(0, lv.length - 1 - typicalFromTop)]!;
      if (lv.indexOf(est) > lv.indexOf(start)) start = est;
      estimated.push(id);
    }
    levels[id] = start;
    placedOut[id] = levelsOf(id).filter((l) => levelsOf(id).indexOf(l) < levelsOf(id).indexOf(start));
    if (!entries.some((e) => e.skillId === id)) untested.push(id);
  }

  const rank = (id: Set1SkillId) => -fromTop(id, levels[id]);
  let strongest: Set1SkillId | null = null;
  let weakest: Set1SkillId | null = null;
  for (const id of settled) {
    if (strongest === null || rank(id) > rank(strongest)) strongest = id;
    if (weakest === null || rank(id) < rank(weakest)) weakest = id;
  }
  return {
    kind: 'done',
    levels,
    placedOut,
    missedWords: entries.filter((e) => !e.correct).map((e) => e.word),
    wordsTested: entries.length,
    endedEarly,
    untested,
    estimated,
    strongest,
    weakest,
  };
}

export function placementStep(entries: PlacementEntry[]): PlacementStep {
  if (missStreak(entries) >= config.placement.maxMissStreak) return finish(entries, true);
  if (entries.length >= config.placement.maxWords) return finish(entries, false);
  for (const id of SET1_SKILL_IDS) {
    const status = groupStatus(id, entries);
    if (!status.settled && status.probing !== null) {
      return { kind: 'probe', skillId: id, level: status.probing, index: status.probed, answered: entries.length };
    }
  }
  return finish(entries, false);
}

/** Held-out words for one probe, in a seeded order so a paused test resumes with the same words. */
export function probeWords(pool: Word[], seed: number): Word[] {
  let s = seed || 1;
  const rng = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return shuffle(pool, rng).slice(0, config.placement.wordsPerProbe);
}

/* ---------- fast adjust ---------- */

export type FastAdjust = 'pending' | 'up' | 'down' | 'stay';

/**
 * Placement is provisional. Over the first 10 practice attempts at a placed
 * level, 9 or more clean reads move the child up at once; 4 or fewer move
 * him down.
 */
export function fastAdjust(attemptsSincePlacement: AttemptLike[]): FastAdjust {
  const f = config.placement.fastAdjust;
  const window = attemptsSincePlacement.filter((a) => a.mode !== 'placement').slice(0, f.window);
  if (window.length < f.window) return 'pending';
  const clean = window.filter(isCleanRead).length;
  if (clean >= f.moveUpAt) return 'up';
  if (clean <= f.moveDownAt) return 'down';
  return 'stay';
}
