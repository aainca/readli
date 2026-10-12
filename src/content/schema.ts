/**
 * Word content schema. Everything here is plain data; no DOM, no React.
 */

export type SyllableType =
  | 'closed'
  | 'open'
  | 'vce'
  | 'team'
  | 'r'
  | 'cle'
  | 'diphthong'
  | 'schwa';

export const SYLLABLE_TYPES: readonly SyllableType[] = [
  'closed',
  'open',
  'vce',
  'team',
  'r',
  'cle',
  'diphthong',
  'schwa',
];

/** The 7 core groups. Ids match the syllable type they teach. */
export type CoreGroupId = 'closed' | 'open' | 'vce' | 'team' | 'r' | 'cle' | 'diphthong';

/** Bonus units that unlock after core progress. */
export type BonusGroupId = 'softcg' | 'yvowel' | 'schwa' | 'affixes';

export type GroupId = CoreGroupId | BonusGroupId;

export type Level = 1 | 2 | 3 | 4;
export const LEVELS: readonly Level[] = [1, 2, 3, 4];

export interface Confusable {
  /** What the recognizer heard, lowercase. */
  heard: string;
  /** Short hint the app shows. It must not say the target word. */
  hint: string;
}

export interface Word {
  /** Lowercase, letters only. "pancake" */
  text: string;
  group: GroupId;
  level: Level;
  /** ["pan", "cake"]; joins to text. */
  syllables: string[];
  /** One type per syllable. */
  syllableTypes: SyllableType[];
  /** Sound chunks: ["r", "ai", "n"]; joins to text. */
  chunks: string[];
  /** Other spellings that sound the same and are accepted: ["sew"] for "so". */
  homophones?: string[];
  /** Common misreadings with a targeted hint. */
  confusables?: Confusable[];
  /**
   * Optional per-syllable text to pass to text-to-speech when a syllable is
   * read aloud in isolation. Browser TTS mispronounces isolated syllables.
   * Filled in during Phase 3.
   */
  sayAs?: (string | null)[];
}

export interface GroupFile {
  group: GroupId;
  words: Word[];
}

export interface GroupMeta {
  id: GroupId;
  kind: 'core' | 'bonus';
  /** Display name. */
  name: string;
  /** Short child-facing label used on syllable tags. */
  label: string;
  /** Lowest level this group has words at. Consonant-le starts at 3. */
  minLevel: Level;
  examples: string[];
  /** Tailwind color token name from index.css (--color-syl-*). */
  color: string;
  /** Order on the home screen. */
  order: number;
}

export const GROUPS: Record<GroupId, GroupMeta> = {
  closed: {
    id: 'closed', kind: 'core', name: 'Closed (short vowel)', label: 'short vowel',
    minLevel: 1, examples: ['cat', 'rabbit'], color: 'syl-closed', order: 1,
  },
  open: {
    id: 'open', kind: 'core', name: 'Open (long vowel)', label: 'long vowel',
    minLevel: 1, examples: ['go', 'robot'], color: 'syl-open', order: 2,
  },
  vce: {
    id: 'vce', kind: 'core', name: 'Silent e', label: 'silent e',
    minLevel: 1, examples: ['cape', 'pancake'], color: 'syl-vce', order: 3,
  },
  team: {
    id: 'team', kind: 'core', name: 'Vowel teams', label: 'vowel team',
    minLevel: 1, examples: ['rain', 'rainbow'], color: 'syl-team', order: 4,
  },
  r: {
    id: 'r', kind: 'core', name: 'Bossy r', label: 'bossy r',
    minLevel: 1, examples: ['car', 'garden'], color: 'syl-r', order: 5,
  },
  cle: {
    id: 'cle', kind: 'core', name: 'Consonant-le', label: 'consonant-le',
    minLevel: 3, examples: ['table', 'candle'], color: 'syl-cle', order: 6,
  },
  diphthong: {
    id: 'diphthong', kind: 'core', name: 'Diphthongs', label: 'gliding vowel',
    minLevel: 1, examples: ['coin', 'cowboy'], color: 'syl-diphthong', order: 7,
  },
  softcg: {
    id: 'softcg', kind: 'bonus', name: 'Soft c and g', label: 'soft c / g',
    minLevel: 1, examples: ['cent', 'gem', 'page'], color: 'syl-vce', order: 8,
  },
  yvowel: {
    id: 'yvowel', kind: 'bonus', name: 'Y as a vowel', label: 'y vowel',
    minLevel: 1, examples: ['fly', 'baby'], color: 'syl-open', order: 9,
  },
  schwa: {
    id: 'schwa', kind: 'bonus', name: 'Schwa', label: 'schwa',
    minLevel: 3, examples: ['melon', 'about'], color: 'syl-schwa', order: 10,
  },
  affixes: {
    id: 'affixes', kind: 'bonus', name: 'Prefixes and suffixes', label: 'prefix / suffix',
    minLevel: 3, examples: ['undo', 'jumping', 'helpful'], color: 'syl-team', order: 11,
  },
};

export const GROUP_IDS = (Object.keys(GROUPS) as GroupId[]).sort(
  (a, b) => GROUPS[a].order - GROUPS[b].order,
);
export const CORE_GROUP_IDS = GROUP_IDS.filter((g) => GROUPS[g].kind === 'core') as CoreGroupId[];
export const BONUS_GROUP_IDS = GROUP_IDS.filter((g) => GROUPS[g].kind === 'bonus') as BonusGroupId[];

/** Child-facing labels for syllable tags in the help ladder. */
export const SYLLABLE_LABELS: Record<SyllableType, string> = {
  closed: 'short vowel',
  open: 'long vowel',
  vce: 'silent e',
  team: 'vowel team',
  r: 'bossy r',
  cle: 'consonant-le',
  diphthong: 'gliding vowel',
  schwa: 'lazy vowel',
};
