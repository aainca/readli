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
