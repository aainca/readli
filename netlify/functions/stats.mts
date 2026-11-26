import { getStore } from '@netlify/blobs';
import { aggregate, type DayRecord } from '../../src/engine/visitors';

/** Returns the aggregated visitor statistics. Cached briefly at the edge. */
export default async (req: Request) => {
  if (req.method !== 'GET') return new Response('method not allowed', { status: 405 });
  const store = getStore('visits');
  const { blobs } = await store.list({ prefix: 'days/' });
  const days: Record<string, DayRecord> = {};
  await Promise.all(
    blobs.map(async (b) => {
      const rec = (await store.get(b.key, { type: 'json' })) as DayRecord | null;
      if (rec) days[b.key.slice('days/'.length)] = rec;
    }),
  );
  const stats = aggregate(days, new Date().toISOString().slice(0, 10));
  return Response.json(stats, { headers: { 'Cache-Control': 'public, max-age=300' } });
};
