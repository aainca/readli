import { chunkWord } from './chunk';
import { deriveDivision, type DivisionPattern } from './division';
import { SKILLS, type Confusable, type Level, type SkillId, type SyllableType, type Word } from './schema';

/**
 * Compact authoring format for word lists, one file per skill.
 *
 *   ## 1                         level header (1-4 for Set 1, A or B for Set 2)
 *   cat                          one syllable, type defaults to the skill's type, chunks auto
 *   * dog                        leading "*" marks a held-out placement-test word
 *   rab-bit | c c                syllables with types
 *   so | | | sew                 homophones (4th field)
 *   cape | | c-a-p-e | | cap=That was a short a. Look at the e at the end.
 *
 * Fields, separated by "|":
 *   1 syllables (dash separated)
 *   2 syllable types (space separated), full names or abbreviations
 *     c=closed o=open v=vce t=team r=r l=cle d=diphthong s=schwa.
 *     Default: the skill's own type for every syllable.
 *   3 chunks (dash separated). Default: derived from syllables and types.
 *   4 homophones (comma separated)
 *   5 confusables: heard=hint; heard=hint
 *   6 division override, one per split (VC/CV, V/CV, VC/V, V/V, C-le, affix),
 *     comma separated. Default: derived from syllables and types.
 *   7 activity override (read | divide | sortEd | heart)
 *   8 say-as text per syllable for TTS, separated by "/", empty to keep the
 *     default: "ta/bul" or "/bul"

 */
export function parseSource(skillId: SkillId, text: string): Word[] {
  const words: Word[] = [];
  let level: Level | null = null;
  const lines = text.split(/\r?\n/);
  const meta = SKILLS[skillId];
  const defaultType = defaultTypeFor(skillId);

  lines.forEach((raw, idx) => {
    const header = /^##\s*([1-4AB])\s*$/.exec(raw.trim());
    if (header) {
      const h = header[1]!;
      level = /\d/.test(h) ? (Number(h) as Level) : (h as Level);
      return;
    }
    let line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    if (level === null) throw new Error(`${skillId}:${idx + 1}: word before a "## <level>" header`);

    let heldOut = false;
    if (line.startsWith('*')) {
      heldOut = true;
      line = line.slice(1).trim();
    }

    const fields = line.split('|').map((f) => f.trim());
    const syllables = (fields[0] ?? '').split('-').filter(Boolean);
    const text = syllables.join('');
    const types: SyllableType[] = fields[1]
      ? fields[1].split(/\s+/).filter(Boolean).map(expandType)
      : syllables.map(() => defaultType);
    const chunks = fields[2] ? fields[2].split('-').filter(Boolean) : chunkWord(syllables, types);
    const homophones = fields[3] ? fields[3].split(',').map((s) => s.trim()).filter(Boolean) : [];
    const confusables: Confusable[] = fields[4]
      ? fields[4]
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((pair) => {
            const eq = pair.indexOf('=');
            if (eq < 0) throw new Error(`${skillId}:${idx + 1}: confusable "${pair}" needs heard=hint`);
            return { heard: pair.slice(0, eq).trim(), hint: pair.slice(eq + 1).trim() };
          })
      : [];

    const word: Word = { text, set: meta.set, skillId, level, syllables, syllableTypes: types, chunks };
    if (syllables.length > 1) {
      word.division = fields[5]
        ? (fields[5].split(',').map((d) => d.trim()).filter(Boolean) as DivisionPattern[])
        : deriveDivision(syllables, types);
    }
    if (fields[6]) word.activity = fields[6] as Word['activity'];
    if (fields[7]) {
      const parts = fields[7].split('/').map((x) => x.trim());
      if (parts.length !== syllables.length) throw new Error(`${skillId}:${idx + 1}: sayAs needs ${syllables.length} parts`);
      word.sayAs = parts.map((x) => x || null);
    }
    else if (meta.activity !== 'read') word.activity = meta.activity;
    if (homophones.length) word.homophones = homophones;
    if (confusables.length) word.confusables = confusables;
    if (heldOut) word.heldOut = true;
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

const SET1_TYPES: Record<string, SyllableType> = {
  '1.1': 'closed', '1.2': 'open', '1.3': 'vce', '1.4': 'team', '1.5': 'r', '1.6': 'cle', '1.7': 'diphthong',
};

function defaultTypeFor(skillId: SkillId): SyllableType {
  if (skillId === '2.11') return 'schwa';
  return SET1_TYPES[skillId] ?? 'closed';
}
