import type { Level, SkillId } from '../content/schema';
import { getDB, type Profile } from './db';

export const DEFAULT_PROFILE_ID = 'default';

/** Until Phase 5 adds real profiles, every attempt belongs to one default profile. */
export async function ensureDefaultProfile(): Promise<Profile> {
  const db = await getDB();
  const existing = await db.get('profiles', DEFAULT_PROFILE_ID);
  if (existing) return existing;
  const profile: Profile = {
    id: DEFAULT_PROFILE_ID,
    name: 'Reader',
    avatarColor: '#f97316',
    createdAt: Date.now(),
    levels: {},
    mastered: {},
    placedOut: {},
    manualUnlocks: [],
  };
  await db.put('profiles', profile);
  return profile;
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  const db = await getDB();
  const p = await db.get('profiles', id);
  if (p && !p.mastered) p.mastered = {};
  return p;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', profile);
}

/** Sets the current level for a skill and records the levels below as mastered when `unlock` is set. */
export async function setSkillLevel(profileId: string, skillId: SkillId, level: Level, opts: { masteredLevel?: Level } = {}): Promise<Profile> {
  const profile = (await getProfile(profileId)) ?? (await ensureDefaultProfile());
  profile.levels = { ...profile.levels, [skillId]: level };
  if (opts.masteredLevel !== undefined) {
    const list = profile.mastered[skillId] ?? [];
    if (!list.includes(opts.masteredLevel)) profile.mastered = { ...profile.mastered, [skillId]: [...list, opts.masteredLevel] };
  }
  await saveProfile(profile);
  return profile;
}

export const AVATAR_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444'];

export async function listProfiles(): Promise<Profile[]> {
  const db = await getDB();
  const all = await db.getAll('profiles');
  return all.map((p) => ({ ...p, mastered: p.mastered ?? {} })).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createProfile(name: string, avatarColor: string): Promise<Profile> {
  const profile: Profile = {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Reader',
    avatarColor,
    createdAt: Date.now(),
    levels: {},
    mastered: {},
    placedOut: {},
    manualUnlocks: [],
  };
  await saveProfile(profile);
  return profile;
}

/** Removes a profile and everything logged under it. */
export async function deleteProfile(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['profiles', 'attempts', 'reviews', 'placements', 'settings'], 'readwrite');
  await tx.objectStore('profiles').delete(id);
  for (const store of ['attempts', 'placements'] as const) {
    let cursor = await tx.objectStore(store).index('byProfile').openCursor(id);
    while (cursor) { await cursor.delete(); cursor = await cursor.continue(); }
  }
  let rc = await tx.objectStore('reviews').index('byProfile').openCursor(id);
  while (rc) { await rc.delete(); rc = await rc.continue(); }
  let sc = await tx.objectStore('settings').openCursor();
  while (sc) { if (sc.key.includes(`:${id}`)) await sc.delete(); sc = await sc.continue(); }
  await tx.done;
}
