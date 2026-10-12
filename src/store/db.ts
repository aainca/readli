import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GroupId, Level } from '../content/schema';

/**
 * IndexedDB layout. Filled in during Phase 4 and 5; declared now so the
 * schema is versioned from the start.
 */
export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: number;
  /** Current level per group. */
  levels: Partial<Record<GroupId, Level>>;
}

export interface AttemptRecord {
  id?: number;
  profileId: string;
  word: string;
  group: GroupId;
  level: Level;
  timestamp: number;
  tries: number;
  /** 0 = no help, 1-3 = highest help step used. */
  helpStep: 0 | 1 | 2 | 3;
  result: 'correct' | 'modeled' | 'skipped';
  overrideUsed: boolean;
  stars: number;
}

interface VowelDB extends DBSchema {
  profiles: { key: string; value: Profile };
  attempts: {
    key: number;
    value: AttemptRecord;
    indexes: { byProfile: string; byProfileWord: [string, string]; byProfileTime: [string, number] };
  };
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
    },
  });
  return dbPromise;
}
