import { getDB } from './db';

/** Reads a setting, returning the fallback when unset or when storage fails. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDB();
    const rec = await db.get('settings', key);
    return rec ? (rec.value as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    await db.put('settings', { key, value });
  } catch {
    // Storage is best effort; the app keeps working without it.
  }
}

export const settingKeys = {
  showRule: (profileId: string) => `showRule:${profileId}`,
};
