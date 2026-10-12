/**
 * Word content schema. Everything here is plain data; no DOM, no React.
 *
 * Content is organized in two sets. Set 1 is the 7 vowel groups (skills 1.1
 * to 1.7). Set 2 is every skill outside those (2.1 to 2.14). Skill IDs are
 * used in the data, the UI, the store and the dashboard.
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
  'closed', 'open', 'vce', 'team', 'r', 'cle', 'diphthong', 'schwa',
];

export type SetNumber = 1 | 2;

export type Set1SkillId = '1.1' | '1.2' | '1.3' | '1.4' | '1.5' | '1.6' | '1.7';
export type Set2SkillId =
  | '2.1' | '2.2' | '2.3' | '2.4' | '2.5' | '2.6' | '2.7'
  | '2.8' | '2.9' | '2.10' | '2.11' | '2.12' | '2.13' | '2.14';
export type SkillId = Set1SkillId | Set2SkillId;

/** Set 1 uses 1 to 4. Set 2 uses A (one syllable) and B (multi-syllable). */
export type Set1Level = 1 | 2 | 3 | 4;
export type Set2Level = 'A' | 'B';
export type Level = Set1Level | Set2Level;
export const SET1_LEVELS: readonly Set1Level[] = [1, 2, 3, 4];
export const SET2_LEVELS: readonly Set2Level[] = ['A', 'B'];

export type Activity = 'read' | 'divide' | 'sortEd' | 'heart';

export interface Confusable {
  /** What the recognizer heard, lowercase. */
  heard: string;
  /** Short hint the app shows. It must not say the target word. */
  hint: string;
}

export interface Word {
  /** Lowercase, letters only. "pancake" */
  text: string;
  /** 1 = Vowel Groups, 2 = Word Skills */
  set: SetNumber;
  /** "1.3", "2.7" */
  skillId: SkillId;
  level: Level;
  /** Default 'read'. */
  activity?: Activity;
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
   * Held out for the placement test. The scheduler never serves these in
   * practice, so the test measures decoding rather than memory.
   */
  heldOut?: boolean;
  /**
   * Optional per-syllable text for text-to-speech when a syllable is read
   * alone. Browser TTS mispronounces isolated syllables. Filled in Phase 3.
   */
  sayAs?: (string | null)[];
}

export interface SkillFile {
  skillId: SkillId;
  words: Word[];
}

export interface SkillMeta {
  id: SkillId;
  set: SetNumber;
  /** File name stem for source/*.txt and skills/*.json. */
  slug: string;
  /** Display name. */
  name: string;
  /** Short child-facing label used on syllable tags. */
  label: string;
  /** Levels this skill has. Consonant-le starts at 3; some Set 2 skills are B only. */
  levels: readonly Level[];
  examples: string[];
  /** Tailwind color token name from index.css (--color-syl-*). */
  color: string;
  /** Teaching order inside the set. */
  order: number;
  /** Activity used for this skill's words unless a word overrides it. */
  activity: Activity;
  /** Whether the skill has content in v1. */
  shipsIn: 'v1' | 'v2';
}

const L1_4: readonly Level[] = [1, 2, 3, 4];
const L3_4: readonly Level[] = [3, 4];
const AB: readonly Level[] = ['A', 'B'];
const B: readonly Level[] = ['B'];

export const SKILLS: Record<SkillId, SkillMeta> = {
  '1.1': { id: '1.1', set: 1, slug: '1.1-closed', name: 'Closed (short vowel)', label: 'short vowel', levels: L1_4, examples: ['cat', 'rabbit'], color: 'syl-closed', order: 1, activity: 'read', shipsIn: 'v1' },
  '1.2': { id: '1.2', set: 1, slug: '1.2-open', name: 'Open (long vowel)', label: 'long vowel', levels: L1_4, examples: ['go', 'robot'], color: 'syl-open', order: 2, activity: 'read', shipsIn: 'v1' },
  '1.3': { id: '1.3', set: 1, slug: '1.3-silent-e', name: 'Silent e', label: 'silent e', levels: L1_4, examples: ['cape', 'pancake'], color: 'syl-vce', order: 3, activity: 'read', shipsIn: 'v1' },
  '1.4': { id: '1.4', set: 1, slug: '1.4-vowel-teams', name: 'Vowel teams', label: 'vowel team', levels: L1_4, examples: ['rain', 'rainbow'], color: 'syl-team', order: 4, activity: 'read', shipsIn: 'v1' },
  '1.5': { id: '1.5', set: 1, slug: '1.5-r-controlled', name: 'Bossy r', label: 'bossy r', levels: L1_4, examples: ['car', 'garden'], color: 'syl-r', order: 5, activity: 'read', shipsIn: 'v1' },
  '1.6': { id: '1.6', set: 1, slug: '1.6-consonant-le', name: 'Consonant-le', label: 'consonant-le', levels: L3_4, examples: ['table', 'candle'], color: 'syl-cle', order: 6, activity: 'read', shipsIn: 'v1' },
  '1.7': { id: '1.7', set: 1, slug: '1.7-diphthongs', name: 'Diphthongs', label: 'gliding vowel', levels: L1_4, examples: ['coin', 'cowboy'], color: 'syl-diphthong', order: 7, activity: 'read', shipsIn: 'v1' },

  '2.1': { id: '2.1', set: 2, slug: '2.1-soft-c-g', name: 'Soft c and g', label: 'soft c / g', levels: AB, examples: ['cent', 'gem', 'page'], color: 'syl-vce', order: 1, activity: 'read', shipsIn: 'v1' },
  '2.2': { id: '2.2', set: 2, slug: '2.2-consonant-teams', name: 'Consonant teams', label: 'consonant team', levels: AB, examples: ['ship', 'catch', 'bridge'], color: 'syl-closed', order: 2, activity: 'read', shipsIn: 'v2' },
  '2.3': { id: '2.3', set: 2, slug: '2.3-syllable-division', name: 'Syllable division', label: 'syllable split', levels: B, examples: ['rabbit', 'robot', 'lion'], color: 'syl-team', order: 3, activity: 'divide', shipsIn: 'v2' },
  '2.4': { id: '2.4', set: 2, slug: '2.4-glued-sounds', name: 'Glued sounds', label: 'glued sound', levels: AB, examples: ['sang', 'pink', 'ball'], color: 'syl-r', order: 4, activity: 'read', shipsIn: 'v2' },
  '2.5': { id: '2.5', set: 2, slug: '2.5-closed-exceptions', name: 'Closed-syllable exceptions', label: 'exception', levels: AB, examples: ['wild', 'find', 'cold'], color: 'syl-open', order: 5, activity: 'read', shipsIn: 'v2' },
  '2.6': { id: '2.6', set: 2, slug: '2.6-y-as-vowel', name: 'Y as a vowel', label: 'y vowel', levels: AB, examples: ['fly', 'baby'], color: 'syl-open', order: 6, activity: 'read', shipsIn: 'v2' },
  '2.7': { id: '2.7', set: 2, slug: '2.7-ed-sounds', name: 'Three sounds of -ed', label: '-ed', levels: AB, examples: ['jumped', 'played', 'wanted'], color: 'syl-diphthong', order: 7, activity: 'sortEd', shipsIn: 'v2' },
  '2.8': { id: '2.8', set: 2, slug: '2.8-suffix-changes', name: 'Suffix spelling changes', label: 'suffix change', levels: AB, examples: ['hopping', 'hoping', 'cried'], color: 'syl-cle', order: 8, activity: 'read', shipsIn: 'v2' },
  '2.9': { id: '2.9', set: 2, slug: '2.9-other-vowel-teams', name: 'Other vowel teams', label: 'vowel team', levels: AB, examples: ['moon', 'book', 'bread'], color: 'syl-team', order: 9, activity: 'read', shipsIn: 'v2' },
  '2.10': { id: '2.10', set: 2, slug: '2.10-silent-letters', name: 'Silent letter pairs', label: 'silent letter', levels: AB, examples: ['knee', 'write', 'lamb'], color: 'syl-schwa', order: 10, activity: 'read', shipsIn: 'v2' },
  '2.11': { id: '2.11', set: 2, slug: '2.11-schwa', name: 'Schwa', label: 'lazy vowel', levels: B, examples: ['melon', 'about'], color: 'syl-schwa', order: 11, activity: 'read', shipsIn: 'v2' },
  '2.12': { id: '2.12', set: 2, slug: '2.12-prefixes-suffixes', name: 'Prefixes and suffixes', label: 'prefix / suffix', levels: B, examples: ['undo', 'helpful', 'useless'], color: 'syl-team', order: 12, activity: 'read', shipsIn: 'v2' },
  '2.13': { id: '2.13', set: 2, slug: '2.13-stable-endings', name: 'Stable endings', label: 'stable ending', levels: B, examples: ['nation', 'picture'], color: 'syl-vce', order: 13, activity: 'read', shipsIn: 'v2' },
  '2.14': { id: '2.14', set: 2, slug: '2.14-heart-words', name: 'Heart words', label: 'heart word', levels: AB, examples: ['said', 'was', 'of'], color: 'syl-closed', order: 14, activity: 'heart', shipsIn: 'v2' },
};

function sortedIds(set?: SetNumber): SkillId[] {
  return (Object.keys(SKILLS) as SkillId[])
    .filter((id) => set === undefined || SKILLS[id].set === set)
    .sort((a, b) => SKILLS[a].set - SKILLS[b].set || SKILLS[a].order - SKILLS[b].order);
}

export const SKILL_IDS: SkillId[] = sortedIds();
export const SET1_SKILL_IDS = sortedIds(1) as Set1SkillId[];
export const SET2_SKILL_IDS = sortedIds(2) as Set2SkillId[];

export function isSet1Level(level: Level): level is Set1Level {
  return typeof level === 'number';
}

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
