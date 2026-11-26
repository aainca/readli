import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import type { DayRecord } from '../../src/engine/visitors';

/**
 * Records one visit. Called once per browser session by the app.
 * Stores a salted hash of address + browser (never the address itself) and
 * the place Netlify's edge reports for the request, under today's record.
 */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const salt = Netlify.env.get('VISIT_SALT') ?? 'vowel-mastery';
  const ua = req.headers.get('user-agent') ?? '';
  const hash = await sha256(`${salt}|${context.ip}|${ua}`);
  const today = new Date().toISOString().slice(0, 10);
  const geo = context.geo ?? {};
  const place = {
    country: geo.country?.code ?? '??',
    countryName: geo.country?.name ?? 'Unknown',
    region: geo.subdivision?.name,
    city: geo.city,
  };
  const store = getStore('visits');
  const key = `days/${today}`;
  const day = ((await store.get(key, { type: 'json' })) as DayRecord | null) ?? {};
  const isNew = !(hash in day);
  if (isNew) {
    day[hash] = place;
    await store.setJSON(key, day);
  }
  return Response.json({ ok: true, counted: isNew });
};
