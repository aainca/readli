import type { Level, Set1SkillId } from '../content/schema';
import type { Placement } from '../engine/placement';
import { getDB, type PlacementResult } from './db';
import { getProfile, ensureDefaultProfile, saveProfile } from './profiles';

/** Writes a finished test to the profile (levels, placed-out, provisional) and the history. */
export async function applyPlacement(profileId: string, placement: Placement, date: number): Promise<PlacementResult> {
  const profile = (await getProfile(profileId)) ?? (await ensureDefaultProfile());
  const provisional: NonNullable<typeof profile.provisional> = {};
  for (const [id, level] of Object.entries(placement.levels) as [Set1SkillId, Level][]) {
    profile.levels = { ...profile.levels, [id]: level };
    profile.placedOut = { ...profile.placedOut, [id]: placement.placedOut[id] };
    provisional[id] = { level, since: date };
  }
  profile.provisional = provisional;
  profile.lastPlacementAt = date;
  await saveProfile(profile);

  const result: PlacementResult = {
    profileId,
    date,
    placement: placement.levels,
    missedWords: placement.missedWords,
    wordsTested: placement.wordsTested,
    endedEarly: placement.endedEarly,
    estimated: placement.estimated,
    untested: placement.untested,
    strongest: placement.strongest,
    weakest: placement.weakest,
  };
  const db = await getDB();
  await db.add('placements', result);
  return result;
}

export async function placementHistory(profileId: string): Promise<PlacementResult[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('placements', 'byProfile', profileId);
  return all.sort((a, b) => a.date - b.date);
}

/** Clears the fast-adjust flag for a skill once it has been applied. */
export async function clearProvisional(profileId: string, skillId: string): Promise<void> {
  const profile = await getProfile(profileId);
  if (!profile?.provisional) return;
  const { [skillId as Set1SkillId]: _gone, ...rest } = profile.provisional;
  profile.provisional = rest;
  await saveProfile(profile);
}
