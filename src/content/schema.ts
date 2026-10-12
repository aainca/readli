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
  /** One-line child-friendly rule shown on the word card. */
  hint: string;
  /** Longer explanation for the rules guide. */
  explanation: string;
}

const L1_4: readonly Level[] = [1, 2, 3, 4];
const L3_4: readonly Level[] = [3, 4];
const AB: readonly Level[] = ['A', 'B'];
const B: readonly Level[] = ['B'];

export const SKILLS: Record<SkillId, SkillMeta> = {
  '1.1': { id: '1.1', set: 1, slug: '1.1-closed', name: 'Closed (short vowel)', label: 'short vowel', levels: L1_4, examples: ['cat', 'rabbit'], color: 'syl-closed', order: 1, activity: 'read', shipsIn: 'v1', hint: 'Short vowel sound: a consonant trapped the vowel at the end!', explanation: 'When a single vowel is followed ("trapped") by one or more consonants, the vowel makes its quick short sound.' },
  '1.2': { id: '1.2', set: 1, slug: '1.2-open', name: 'Open (long vowel)', label: 'long vowel', levels: L1_4, examples: ['go', 'robot'], color: 'syl-open', order: 2, activity: 'read', shipsIn: 'v1', hint: 'Long vowel sound: nothing closes the door, so the vowel shouts its name!', explanation: 'When a syllable ends with a vowel and no consonant is stopping it, the vowel is free to say its long name.' },
  '1.3': { id: '1.3', set: 1, slug: '1.3-silent-e', name: 'Silent e', label: 'silent e', levels: L1_4, examples: ['cape', 'pancake'], color: 'syl-vce', order: 3, activity: 'read', shipsIn: 'v1', hint: 'Long vowel sound: silent e jumps over to make the vowel say its name!', explanation: 'The magic e at the end stays quiet and bossy. It forces the middle vowel to say its long name sound!' },
  '1.4': { id: '1.4', set: 1, slug: '1.4-vowel-teams', name: 'Vowel teams', label: 'vowel team', levels: L1_4, examples: ['rain', 'rainbow'], color: 'syl-team', order: 4, activity: 'read', shipsIn: 'v1', hint: 'When two vowels go walking, the first one does the talking!', explanation: 'Two vowels stand side by side. The first vowel says its long name while the second walking buddy stays quiet!' },
  '1.5': { id: '1.5', set: 1, slug: '1.5-r-controlled', name: 'Bossy r', label: 'bossy r', levels: L1_4, examples: ['car', 'garden'], color: 'syl-r', order: 5, activity: 'read', shipsIn: 'v1', hint: 'The letter r bosses the vowel to make a brand new sound!', explanation: "When an r stands right after a vowel, it steals the vowel's normal voice and controls the sound." },
  '1.6': { id: '1.6', set: 1, slug: '1.6-consonant-le', name: 'Consonant-le', label: 'consonant-le', levels: L3_4, examples: ['table', 'candle'], color: 'syl-cle', order: 6, activity: 'read', shipsIn: 'v1', hint: 'Consonant plus le: count back three letters to find the last syllable!', explanation: 'When a word ends in a consonant and le, those three letters make their own little syllable, like ta-ble and can-dle.' },
  '1.7': { id: '1.7', set: 1, slug: '1.7-diphthongs', name: 'Diphthongs', label: 'gliding vowel', levels: L1_4, examples: ['coin', 'cowboy'], color: 'syl-diphthong', order: 7, activity: 'read', shipsIn: 'v1', hint: 'Vowels gliding together to make a mouth-shifting sound!', explanation: 'Two vowels join forces to make a brand new gliding sound (like oy or ow) where your mouth changes shape.' },

  '2.1': { id: '2.1', set: 2, slug: '2.1-soft-c-g', name: 'Soft c and g', label: 'soft c / g', levels: AB, examples: ['cent', 'gem', 'page'], color: 'syl-vce', order: 1, activity: 'read', shipsIn: 'v1', hint: 'C and g soften up (like s and j) when followed by e, i, or y!', explanation: 'The letters e, i, and y are magic signals! They turn c into /s/ and g into /j/.' },
  '2.2': { id: '2.2', set: 2, slug: '2.2-consonant-teams', name: 'Consonant teams', label: 'consonant team', levels: AB, examples: ['ship', 'catch', 'bridge'], color: 'syl-closed', order: 2, activity: 'read', shipsIn: 'v2', hint: 'Two letters, one sound: sh, ch, th, wh, ck, ph, tch, dge.', explanation: 'Some consonants team up to make a single new sound. Read them together, not one at a time.' },
  '2.3': { id: '2.3', set: 2, slug: '2.3-syllable-division', name: 'Syllable division', label: 'syllable split', levels: B, examples: ['rabbit', 'robot', 'lion'], color: 'syl-team', order: 3, activity: 'divide', shipsIn: 'v2', hint: 'Find the vowels, then decide where the word splits.', explanation: 'Two consonants between vowels split in the middle (rab-bit). One consonant usually goes with the second syllable (ro-bot). If that sounds wrong, try cab-in.' },
  '2.4': { id: '2.4', set: 2, slug: '2.4-glued-sounds', name: 'Glued sounds', label: 'glued sound', levels: AB, examples: ['sang', 'pink', 'ball'], color: 'syl-r', order: 4, activity: 'read', shipsIn: 'v2', hint: 'Glued sounds stick together: ang, ing, ong, ank, ink, all.', explanation: 'These letters are glued into one chunk. Say the whole chunk at once instead of sounding out each letter.' },
  '2.5': { id: '2.5', set: 2, slug: '2.5-closed-exceptions', name: 'Closed-syllable exceptions', label: 'exception', levels: AB, examples: ['wild', 'find', 'cold'], color: 'syl-open', order: 5, activity: 'read', shipsIn: 'v2', hint: 'Sometimes a closed syllable breaks the rule: ild, ind, old, olt, ost.', explanation: 'In these special endings the vowel says its long name even though a consonant closes it, like wild, find and cold.' },
  '2.6': { id: '2.6', set: 2, slug: '2.6-y-as-vowel', name: 'Y as a vowel', label: 'y vowel', levels: AB, examples: ['fly', 'baby'], color: 'syl-open', order: 6, activity: 'read', shipsIn: 'v2', hint: 'Y can be a vowel! It says long i at the end of short words and long e at the end of longer ones.', explanation: "When y is the only vowel in a syllable it does a vowel's job: fly says long i, baby says long e." },
  '2.7': { id: '2.7', set: 2, slug: '2.7-ed-sounds', name: 'Three sounds of -ed', label: '-ed', levels: AB, examples: ['jumped', 'played', 'wanted'], color: 'syl-diphthong', order: 7, activity: 'sortEd', shipsIn: 'v2', hint: 'The ending -ed can say /t/, /d/, or /ed/.', explanation: 'Listen to the sound before -ed. Jumped says /t/, played says /d/, and wanted says /ed/.' },
  '2.8': { id: '2.8', set: 2, slug: '2.8-suffix-changes', name: 'Suffix spelling changes', label: 'suffix change', levels: AB, examples: ['hopping', 'hoping', 'cried'], color: 'syl-cle', order: 8, activity: 'read', shipsIn: 'v2', hint: 'Adding an ending can change the spelling: double it, drop the e, or change y to i.', explanation: 'Hop becomes hopping (double the p), hope becomes hoping (drop the e), cry becomes cried (y to i).' },
  '2.9': { id: '2.9', set: 2, slug: '2.9-other-vowel-teams', name: 'Other vowel teams', label: 'vowel team', levels: AB, examples: ['moon', 'book', 'bread'], color: 'syl-team', order: 9, activity: 'read', shipsIn: 'v2', hint: 'More vowel teams: oo, au, aw, ew, ea as in bread, igh.', explanation: "These teams make their own sounds that are not the first vowel's name. Moon and book, saw and haul, bread, and night." },
  '2.10': { id: '2.10', set: 2, slug: '2.10-silent-letters', name: 'Silent letter pairs', label: 'silent letter', levels: AB, examples: ['knee', 'write', 'lamb'], color: 'syl-schwa', order: 10, activity: 'read', shipsIn: 'v2', hint: 'Some letters are silent: kn, wr, gn, mb.', explanation: 'In these pairs one letter stays quiet. Knee, write, sign and lamb each have a letter you see but do not say.' },
  '2.11': { id: '2.11', set: 2, slug: '2.11-schwa', name: 'Schwa', label: 'lazy vowel', levels: B, examples: ['melon', 'about'], color: 'syl-schwa', order: 11, activity: 'read', shipsIn: 'v2', hint: 'Schwa is the lazy vowel. It just says uh.', explanation: 'In an unstressed syllable the vowel relaxes into a quick uh sound, like the o in melon and the a in about.' },
  '2.12': { id: '2.12', set: 2, slug: '2.12-prefixes-suffixes', name: 'Prefixes and suffixes', label: 'prefix / suffix', levels: B, examples: ['undo', 'helpful', 'useless'], color: 'syl-team', order: 12, activity: 'read', shipsIn: 'v2', hint: 'Prefixes go in front and suffixes go at the end: un-, re-, dis-, -ing, -ful, -less.', explanation: 'Find the base word first, then add the chunk at the front or the end. Un-pack, help-ful, use-less.' },
  '2.13': { id: '2.13', set: 2, slug: '2.13-stable-endings', name: 'Stable endings', label: 'stable ending', levels: B, examples: ['nation', 'picture'], color: 'syl-vce', order: 13, activity: 'read', shipsIn: 'v2', hint: 'Stable endings always say the same thing: tion, sion, ture.', explanation: 'These endings are their own syllable and always sound the same: na-tion, pic-ture.' },
  '2.14': { id: '2.14', set: 2, slug: '2.14-heart-words', name: 'Heart words', label: 'heart word', levels: AB, examples: ['said', 'was', 'of'], color: 'syl-closed', order: 14, activity: 'heart', shipsIn: 'v2', hint: 'Heart words have a part you learn by heart.', explanation: 'These words cannot be fully sounded out. Most of the word is regular, and the tricky letters get a heart.' },
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
