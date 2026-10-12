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
