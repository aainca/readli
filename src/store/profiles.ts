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
    placedOut: {},
    manualUnlocks: [],
  };
  await db.put('profiles', profile);
  return profile;
}
