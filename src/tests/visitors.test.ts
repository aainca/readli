import { describe, expect, it } from 'vitest';
import { aggregate, flag } from '../engine/visitors';

const us = { country: 'US', countryName: 'United States', region: 'California', city: 'Los Angeles' };
const ca = { country: 'CA', countryName: 'Canada', city: 'Toronto' };

describe('aggregate', () => {
  it('counts unique visitors across days and groups by place', () => {
    const s = aggregate(
      { '2026-11-25': { a: us, b: us }, '2026-11-26': { a: us, c: ca } },
      '2026-11-26',
    );
    expect(s.uniqueVisitors).toBe(3);
    expect(s.visitsToday).toBe(2);
    expect(s.days).toBe(2);
    expect(s.firstDay).toBe('2026-11-25');
    expect(s.countries).toEqual([{ code: 'US', name: 'United States', visitors: 2 }, { code: 'CA', name: 'Canada', visitors: 1 }]);
    expect(s.cities[0]).toEqual({ label: 'Los Angeles, California', visitors: 2 });
  });
  it('handles no data', () => {
    expect(aggregate({}, '2026-11-26')).toMatchObject({ uniqueVisitors: 0, visitsToday: 0, days: 0, firstDay: null, countries: [] });
  });
});

describe('flag', () => {
  it('turns a country code into a flag', () => {
    expect(flag('US')).toBe('🇺🇸');
    expect(flag('??')).toBe('🌍');
  });
});
