import type { SyllableType, Word } from '../content/schema';

/**
 * Text to hand to TTS for one syllable spoken alone. Browser voices read
 * isolated syllables as if they were words or abbreviations ("ta" as "tah",
 * "ble" as "bleh"), so common shapes get a respelling. A word's sayAs field
 * overrides this per syllable. Known weak spot: test by ear and add
 * overrides in the source files (field 8, syllables separated by /).
 */
const OPEN_VOWEL: Record<string, string> = { a: 'ay', e: 'ee', i: 'eye', o: 'oh', u: 'oo', y: 'eye' };

export function sayAsFor(syllable: string, type: SyllableType): string {
  switch (type) {
    case 'cle': {
      // "ble" -> "bul", "tle" -> "tul", "ckle" -> "kul", "stle" -> "sul"
      const cons = syllable.slice(0, -2).replace(/ck$/, 'k').replace(/st$/, 's');
      return `${cons}ul`;
    }
    case 'open': {
      const last = syllable[syllable.length - 1]!;
      const v = OPEN_VOWEL[last];
      if (!v) return syllable;
      const stem = syllable.slice(0, -1);
      if (stem === '') return v;
      if (last === 'u' && /[mfhc]$/.test(stem)) return `${stem}yoo`;
      if (last === 'i' || last === 'y') return `${stem}ye`;
      return `${stem}${v}`;
    }
    case 'schwa': {
      if (syllable.length === 1) return 'uh';
      return syllable;
    }
    default:
      return syllable;
  }
}

/** Per-syllable TTS text for a word, with overrides applied. */
export function syllableSpeech(word: Word): string[] {
  return word.syllables.map((syl, i) => word.sayAs?.[i] || sayAsFor(syl, word.syllableTypes[i] ?? 'closed'));
}
