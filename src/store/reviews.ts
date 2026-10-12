import type { ReviewItem } from '../engine/scheduler';
import { getDB } from './db';

export async function getReviews(profileId: string): Promise<ReviewItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('reviews', 'byProfile', profileId);
}

export async function getReview(profileId: string, word: string): Promise<ReviewItem | undefined> {
  const db = await getDB();
  return db.get('reviews', [profileId, word]);
}

export async function putReview(item: ReviewItem): Promise<void> {
  const db = await getDB();
  await db.put('reviews', item);
}
