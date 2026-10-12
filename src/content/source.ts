import { chunkWord } from './chunk';
import { GROUPS, type Confusable, type GroupId, type Level, type SyllableType, type Word } from './schema';

/**
 * Compact authoring format for word lists, one file per group.
 *
 *   ## 1                         level header
 *   cat                          one closed syllable, chunks auto
 *   rab-bit | closed closed      syllables with types
 *   so | | | sew                 homophones (4th field)
 *   cape | | c-a-p-e | | cap=That was a short a. Look at the e at the end.
 *
 * Fields, separated by "|":
 *   1 syllables (dash separated)
 *   2 syllable types (space separated), full names or abbreviations
 *     c=closed o=open v=vce t=team r=r l=cle d=diphthong s=schwa.
 *     Default: the group's own type for every syllable.
 *   3 chunks (dash separated). Default: derived from syllables and types.
 *   4 homophones (comma separated)
 *   5 confusables: heard=hint; heard=hint
 */
export function parseSource(group: GroupId, text: string): Word[] {
  const words: Word[] = [];
  let level: Level | null = null;
  const lines = text.split(/\r?\n/);
  const defaultType = defaultTypeFor(group);

  lines.forEach((raw, idx) => {
    const header = /^##\s*([1-4])\s*$/.exec(raw.trim());
    if (header) {
      level = Number(header[1]) as Level;
      return;
    }
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    if (level === null) throw new Error(`${group}:${idx + 1}: word before a "## <level>" header`);

    const fields = line.split('|').map((f) => f.trim());
    const syllables = (fields[0] ?? '').split('-').filter(Boolean);
    const text = syllables.join('');
    let types: SyllableType[];
    if (fields[1]) {
      types = fields[1].split(/\s+/).filter(Boolean).map(expandType);
    } else {
      types = syllables.map(() => defaultType);
    }
    const chunks = fields[2] ? fields[2].split('-').filter(Boolean) : chunkWord(syllables, types);
    const homophones = fields[3] ? fields[3].split(',').map((s) => s.trim()).filter(Boolean) : [];
    const confusables: Confusable[] = fields[4]
      ? fields[4]
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((pair) => {
            const eq = pair.indexOf('=');
            if (eq < 0) throw new Error(`${group}:${idx + 1}: confusable "${pair}" needs heard=hint`);
            return { heard: pair.slice(0, eq).trim(), hint: pair.slice(eq + 1).trim() };
          })
      : [];

    const word: Word = { text, group, level, syllables, syllableTypes: types, chunks };
    if (homophones.length) word.homophones = homophones;
    if (confusables.length) word.confusables = confusables;
    words.push(word);
  });

  return words;
}

const TYPE_ABBREVIATIONS: Record<string, SyllableType> = {
  c: 'closed', o: 'open', v: 'vce', t: 'team', r: 'r', l: 'cle', d: 'diphthong', s: 'schwa',
};

/** Accepts full type names or one-letter abbreviations (c o v t r l d s). */
export function expandType(t: string): SyllableType {
  return TYPE_ABBREVIATIONS[t] ?? (t as SyllableType);
}

function defaultTypeFor(group: GroupId): SyllableType {
  switch (group) {
    case 'closed':
    case 'open':
    case 'vce':
    case 'team':
    case 'r':
    case 'cle':
    case 'diphthong':
    case 'schwa':
      return group;
    case 'softcg':
    case 'yvowel':
    case 'affixes':
      return 'closed';
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

export const SOURCE_GROUPS = Object.keys(GROUPS) as GroupId[];
