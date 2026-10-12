import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Level, SkillId } from '../content/schema';

/**
 * IndexedDB layout. Filled in during Phase 4 and 5; declared now so the
 * schema is versioned from the start.
 */
export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: number;
  /** Current level per skill, keyed by skill ID ("1.3", "2.1"). */
  levels: Partial<Record<SkillId, Level>>;
  /** Levels the placement test placed the child out of, per skill. */
  placedOut: Partial<Record<SkillId, Level[]>>;
  /** Set 2 skills a parent unlocked by hand. */
  manualUnlocks: SkillId[];
}

/** One placement test run, kept so retests can show change over time. */
export interface PlacementResult {
  id?: number;
  profileId: string;
  date: number;
  /** Starting level per skill. */
  placement: Partial<Record<SkillId, Level>>;
  missedWords: string[];
  wordsTested: number;
  endedEarly: boolean;
}

export interface AttemptRecord {
  id?: number;
  profileId: string;
  word: string;
  skillId: SkillId;
  level: Level;
  timestamp: number;
  tries: number;
  /** 0 = no help, 1-3 = highest help step used. */
  helpStep: 0 | 1 | 2 | 3;
  result: 'correct' | 'modeled' | 'skipped';
  overrideUsed: boolean;
  stars: number;
  /** 'practice' or 'placement'. Placement attempts never count toward mastery. */
  mode: 'practice' | 'placement';
}

interface VowelDB extends DBSchema {
  profiles: { key: string; value: Profile };
  attempts: {
    key: number;
    value: AttemptRecord;
    indexes: { byProfile: string; byProfileWord: [string, string]; byProfileTime: [string, number] };
  };
  placements: { key: number; value: PlacementResult; indexes: { byProfile: string } };
}

let dbPromise: Promise<IDBPDatabase<VowelDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<VowelDB>> {
  dbPromise ??= openDB<VowelDB>('vowel-mastery', 1, {
    upgrade(db) {
      db.createObjectStore('profiles', { keyPath: 'id' });
      const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
      attempts.createIndex('byProfile', 'profileId');
      attempts.createIndex('byProfileWord', ['profileId', 'word']);
      attempts.createIndex('byProfileTime', ['profileId', 'timestamp']);
      const placements = db.createObjectStore('placements', { keyPath: 'id', autoIncrement: true });
      placements.createIndex('byProfile', 'profileId');
    },
  });
  return dbPromise;
}
