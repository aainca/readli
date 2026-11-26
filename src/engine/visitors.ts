/**
 * Visitor statistics, pure. The Netlify functions store one small record per
 * calendar day: visitor hash -> place. Nothing personal is kept: the hash is
 * a salted digest of address + browser, which cannot be reversed.
 */
export interface Place {
  /** ISO country code, e.g. "US", or "??" when unknown. */
  country: string;
  /** Country name as Netlify reports it. */
  countryName: string;
  /** Region or state, when known. */
  region?: string;
  city?: string;
}

/** One day's visitors: hash -> place. */
export type DayRecord = Record<string, Place>;

export interface VisitorStats {
  uniqueVisitors: number;
  visitsToday: number;
  days: number;
  firstDay: string | null;
  countries: { code: string; name: string; visitors: number }[];
  cities: { label: string; visitors: number }[];
}

export function aggregate(days: Record<string, DayRecord>, today: string): VisitorStats {
  const seen = new Map<string, Place>();
  const dayKeys = Object.keys(days).sort();
  for (const d of dayKeys) {
    for (const [hash, place] of Object.entries(days[d] ?? {})) {
      if (!seen.has(hash)) seen.set(hash, place);
    }
  }
  const byCountry = new Map<string, { name: string; visitors: number }>();
  const byCity = new Map<string, number>();
  for (const place of seen.values()) {
    const c = byCountry.get(place.country) ?? { name: place.countryName, visitors: 0 };
    c.visitors += 1;
    byCountry.set(place.country, c);
    if (place.city) {
      const label = place.region ? `${place.city}, ${place.region}` : place.city;
      byCity.set(label, (byCity.get(label) ?? 0) + 1);
    }
  }
  return {
    uniqueVisitors: seen.size,
    visitsToday: Object.keys(days[today] ?? {}).length,
    days: dayKeys.length,
    firstDay: dayKeys[0] ?? null,
    countries: [...byCountry.entries()].map(([code, v]) => ({ code, name: v.name, visitors: v.visitors })).sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name)),
    cities: [...byCity.entries()].map(([label, visitors]) => ({ label, visitors })).sort((a, b) => b.visitors - a.visitors || a.label.localeCompare(b.label)).slice(0, 10),
  };
}

/** Country code to flag emoji ("US" -> 🇺🇸); unknown codes get a globe. */
export function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
