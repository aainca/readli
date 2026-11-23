import type { ReviewItem } from '../engine/scheduler';
import { getDB, type AttemptRecord, type PlacementResult, type Profile, type SettingRecord } from './db';

/** Everything on the device, as one JSON file. */
export interface Backup {
  app: 'vowel-mastery';
  version: 1;
  exportedAt: number;
  profiles: Profile[];
  attempts: AttemptRecord[];
  reviews: ReviewItem[];
  placements: PlacementResult[];
  settings: SettingRecord[];
}

export async function exportBackup(): Promise<Backup> {
  const db = await getDB();
  const [profiles, attempts, reviews, placements, settings] = await Promise.all([
    db.getAll('profiles'), db.getAll('attempts'), db.getAll('reviews'), db.getAll('placements'), db.getAll('settings'),
  ]);
  return { app: 'vowel-mastery', version: 1, exportedAt: Date.now(), profiles, attempts, reviews, placements, settings };
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `vowel-mastery-backup-${d}.json`;
}

export function validateBackup(data: unknown): { ok: true; backup: Backup } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Not a backup file.' };
  const b = data as Partial<Backup>;
  if (b.app !== 'vowel-mastery') return { ok: false, error: 'This file was not made by Vowel Mastery.' };
  if (b.version !== 1) return { ok: false, error: `Unknown backup version ${String(b.version)}.` };
  for (const key of ['profiles', 'attempts', 'reviews', 'placements', 'settings'] as const) {
    if (!Array.isArray(b[key])) return { ok: false, error: `The file is missing "${key}".` };
  }
  if ((b.profiles as Profile[]).some((p) => !p.id || typeof p.name !== 'string')) return { ok: false, error: 'A profile in the file is malformed.' };
  return { ok: true, backup: b as Backup };
}

/** Replaces everything on the device with the backup. */
export async function importBackup(backup: Backup): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['profiles', 'attempts', 'reviews', 'placements', 'settings'], 'readwrite');
  for (const store of ['profiles', 'attempts', 'reviews', 'placements', 'settings'] as const) await tx.objectStore(store).clear();
  for (const p of backup.profiles) await tx.objectStore('profiles').put({ ...p, mastered: p.mastered ?? {} });
  for (const a of backup.attempts) await tx.objectStore('attempts').put(a);
  for (const r of backup.reviews) await tx.objectStore('reviews').put(r);
  for (const pl of backup.placements) await tx.objectStore('placements').put(pl);
  for (const s of backup.settings) await tx.objectStore('settings').put(s);
  await tx.done;
}

/** Clears one profile's history but keeps the profile (levels reset to the first level). */
export async function resetProfileHistory(profileId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['profiles', 'attempts', 'reviews', 'placements'], 'readwrite');
  for (const store of ['attempts', 'placements'] as const) {
    let c = await tx.objectStore(store).index('byProfile').openCursor(profileId);
    while (c) { await c.delete(); c = await c.continue(); }
  }
  let rc = await tx.objectStore('reviews').index('byProfile').openCursor(profileId);
  while (rc) { await rc.delete(); rc = await rc.continue(); }
  const p = await tx.objectStore('profiles').get(profileId);
  if (p) await tx.objectStore('profiles').put({ ...p, levels: {}, mastered: {}, placedOut: {}, provisional: {}, lastPlacementAt: undefined });
  await tx.done;
}
