import {
  SET1_LEVELS,
  SET2_LEVELS,
  SKILLS,
  SYLLABLE_TYPES,
  isSet1Level,
  type Level,
  type SkillFile,
  type SkillId,
  type Word,
} from './schema';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  skillId: SkillId | string;
  word?: string;
  message: string;
}

export interface LevelCount {
  practice: number;
  heldOut: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** counts per skill per level */
  counts: Record<string, Partial<Record<Level, LevelCount>>>;
}

export interface ValidationOptions {
  /** Target practice words (not held out) per skill per level. */
  minWordsPerLevel: number;
  /** Held-out test words expected per Set 1 skill per level. */
  heldOutPerLevel: number;
}

const LOWER = /^[a-z]+$/;
const ACTIVITIES = ['read', 'divide', 'sortEd', 'heart'];

export function validateWord(w: Word, fileSkill: SkillId): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ severity: 'error', skillId: fileSkill, word: w.text, message });
  const meta = SKILLS[fileSkill];

  if (typeof w.text !== 'string' || !LOWER.test(w.text)) err(`text must be lowercase letters only: "${w.text}"`);
  if (w.skillId !== fileSkill) err(`skillId "${w.skillId}" does not match file skill "${fileSkill}"`);
  if (meta && w.set !== meta.set) err(`set ${w.set} does not match skill ${fileSkill} (set ${meta.set})`);

  const validLevels: readonly Level[] = w.set === 2 ? SET2_LEVELS : SET1_LEVELS;
  if (!validLevels.includes(w.level)) err(`level ${w.level} is not valid for set ${w.set}`);
  else if (meta && !meta.levels.includes(w.level)) err(`level ${w.level} is not offered by skill ${fileSkill} (levels ${meta.levels.join(', ')})`);

  if (w.activity !== undefined && !ACTIVITIES.includes(w.activity)) err(`unknown activity "${w.activity}"`);

  if (!Array.isArray(w.syllables) || w.syllables.length === 0) err('syllables missing');
  else {
    if (w.syllables.join('') !== w.text) err(`syllables ${JSON.stringify(w.syllables)} do not join to "${w.text}"`);
    if (w.syllables.some((s) => !LOWER.test(s))) err('syllables must be lowercase letters');
  }

  if (!Array.isArray(w.syllableTypes) || w.syllableTypes.length !== (w.syllables?.length ?? -1)) {
    err(`syllableTypes length ${w.syllableTypes?.length} != syllables length ${w.syllables?.length}`);
  } else {
    for (const t of w.syllableTypes) {
      if (!SYLLABLE_TYPES.includes(t)) err(`unknown syllable type "${t}"`);
    }
  }

  if (!Array.isArray(w.chunks) || w.chunks.length === 0) err('chunks missing');
  else {
    if (w.chunks.join('') !== w.text) err(`chunks ${JSON.stringify(w.chunks)} do not join to "${w.text}"`);
    if (w.chunks.some((c) => !LOWER.test(c))) err('chunks must be lowercase letters');
  }

  if (w.homophones) {
    for (const h of w.homophones) {
      if (!LOWER.test(h)) err(`homophone "${h}" must be lowercase letters`);
      if (h === w.text) err(`homophone "${h}" equals the word itself`);
    }
    if (new Set(w.homophones).size !== w.homophones.length) err('duplicate homophones');
  }

  if (w.confusables) {
    for (const c of w.confusables) {
      if (!LOWER.test(c.heard)) err(`confusable heard "${c.heard}" must be lowercase letters`);
      if (c.heard === w.text) err(`confusable "${c.heard}" equals the word itself`);
      if (!c.hint || !c.hint.trim()) err(`confusable "${c.heard}" has an empty hint`);
      if (c.hint && new RegExp(`\\b${w.text}\\b`, 'i').test(c.hint)) err(`hint for "${c.heard}" reveals the target word`);
      if (w.homophones?.includes(c.heard)) err(`"${c.heard}" is both a homophone and a confusable`);
    }
  }

  if (w.sayAs && w.sayAs.length !== w.syllables.length) err('sayAs length must match syllables');

  // Level shape rules from the spec.
  const n = w.syllables?.length ?? 0;
  if (isSet1Level(w.level)) {
    if ((w.level === 1 || w.level === 2) && n !== 1) err(`level ${w.level} words must have 1 syllable, got ${n}`);
    if (w.level === 3 && n !== 2) err(`level 3 words must have 2 syllables, got ${n}`);
    if (w.level === 4 && n < 2) err(`level 4 words need 2+ syllables, got ${n}`);
  } else {
    if (w.level === 'A' && n !== 1) err(`level A words must have 1 syllable, got ${n}`);
    if (w.level === 'B' && n < 2) err(`level B words need 2+ syllables, got ${n}`);
  }
  if (fileSkill === '1.6' && !w.syllableTypes.includes('cle')) err('consonant-le word has no cle syllable');

  return issues;
}

export function validateContent(files: SkillFile[], options: ValidationOptions): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const counts: ValidationResult['counts'] = {};
  const seen = new Map<string, SkillId>();

  for (const file of files) {
    if (!SKILLS[file.skillId]) {
      errors.push({ severity: 'error', skillId: file.skillId, message: `unknown skill "${file.skillId}"` });
      continue;
    }
    const c: Partial<Record<Level, LevelCount>> = {};
    counts[file.skillId] = c;
    for (const w of file.words) {
      for (const issue of validateWord(w, file.skillId)) {
        (issue.severity === 'error' ? errors : warnings).push(issue);
      }
      const prev = seen.get(w.text);
      if (prev) {
        errors.push({ severity: 'error', skillId: file.skillId, word: w.text, message: `duplicate word (also in "${prev}")` });
      } else {
        seen.set(w.text, file.skillId);
      }
      const lc = (c[w.level] ??= { practice: 0, heldOut: 0 });
      if (w.heldOut) lc.heldOut += 1;
      else lc.practice += 1;
    }
  }

  for (const file of files) {
    const meta = SKILLS[file.skillId];
    if (!meta) continue;
    const c = counts[file.skillId] ?? {};
    for (const level of meta.levels) {
      const lc = c[level] ?? { practice: 0, heldOut: 0 };
      const total = lc.practice + lc.heldOut;
      if (total === 0) {
        warnings.push({ severity: 'warning', skillId: file.skillId, message: `level ${level} has no words (stub)` });
        continue;
      }
      if (lc.practice < options.minWordsPerLevel) {
        warnings.push({ severity: 'warning', skillId: file.skillId, message: `level ${level} has ${lc.practice} practice words, target is ${options.minWordsPerLevel}` });
      }
      if (meta.set === 1 && lc.heldOut !== options.heldOutPerLevel) {
        warnings.push({ severity: 'warning', skillId: file.skillId, message: `level ${level} has ${lc.heldOut} held-out test words, target is ${options.heldOutPerLevel}` });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, counts };
}
