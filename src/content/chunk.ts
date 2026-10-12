import type { SyllableType } from './schema';

/**
 * Splits one syllable into sound chunks based on its syllable type.
 * Consonant digraphs are always kept together. Vowel teams and r-combos are
 * kept together only when the syllable type calls for them, so "here" (vce)
 * becomes h-e-r-e while "her" (r) becomes h-er.
 *
 * This is a deterministic helper for authoring. Content files store the
 * resulting chunks explicitly, and the parent review sheet shows them.
 */

const CONSONANT_UNITS = ['tch', 'dge', 'sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'qu', 'nk'];
const TEAM_UNITS = ['igh', 'eigh', 'ai', 'ay', 'ee', 'ea', 'ey', 'oa', 'ow', 'oe', 'ie', 'ue', 'ui', 'ew', 'oo', 'au', 'aw', 'ei'];
const DIPHTHONG_UNITS = ['oi', 'oy', 'ou', 'ow'];
const R_UNITS = ['ar', 'or', 'er', 'ir', 'ur', 'ear', 'ore', 'air', 'are', 'eer'];
const CLE_UNITS = ['le'];

function unitsFor(type: SyllableType): string[] {
  const units = [...CONSONANT_UNITS];
  switch (type) {
    case 'team':
      units.push(...TEAM_UNITS);
      break;
    case 'diphthong':
      units.push(...DIPHTHONG_UNITS);
      break;
    case 'r':
      units.push(...R_UNITS);
      break;
    case 'cle':
      units.push(...CLE_UNITS);
      break;
    default:
      break;
  }
  // Longest first so "tch" wins over "ch", "igh" over "ie".
  return units.sort((a, b) => b.length - a.length);
}

/** "ng" followed by e is n + soft g (change, hinge), not the /ng/ digraph. */
function isSoftGAfterN(syllable: string, i: number, unit: string): boolean {
  return unit === 'ng' && syllable[i + 2] === 'e';
}

export function chunkSyllable(syllable: string, type: SyllableType): string[] {
  const units = unitsFor(type);
  const out: string[] = [];
  let i = 0;
  while (i < syllable.length) {
    const unit = units.find((u) => syllable.startsWith(u, i) && !isSoftGAfterN(syllable, i, u));
    if (unit) {
      out.push(unit);
      i += unit.length;
    } else {
      out.push(syllable[i]!);
      i += 1;
    }
  }
  return out;
}

export function chunkWord(syllables: string[], types: SyllableType[]): string[] {
  return syllables.flatMap((s, i) => chunkSyllable(s, types[i] ?? 'closed'));
}
