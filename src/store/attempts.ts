import { getDB, type AttemptRecord } from './db';

export async function logAttempt(record: Omit<AttemptRecord, 'id'>): Promise<void> {
  try {
    const db = await getDB();
    await db.add('attempts', record as AttemptRecord);
  } catch (err) {
    console.warn('could not log attempt', err);
  }
}

export async function countAttempts(profileId: string): Promise<number> {
  const db = await getDB();
  return db.countFromIndex('attempts', 'byProfile', profileId);
}

export async function attemptsForLevel(profileId: string, skillId: string, level: string | number): Promise<AttemptRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('attempts', 'byProfileSkillLevel', [profileId, skillId, level]);
}

/** Lifetime stars for a profile, summed from the attempt log. */
export async function totalStars(profileId: string): Promise<number> {
  const db = await getDB();
  const all = await db.getAllFromIndex('attempts', 'byProfile', profileId);
  return all.reduce((sum, a) => sum + (a.stars ?? 0), 0);
}
