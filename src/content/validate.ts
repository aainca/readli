import {
  GROUPS,
  LEVELS,
  SYLLABLE_TYPES,
  type GroupFile,
  type GroupId,
  type Level,
  type Word,
} from './schema';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  group: GroupId | string;
  word?: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** word count per group per level */
  counts: Record<string, Partial<Record<Level, number>>>;
}

const LOWER = /^[a-z]+$/;

export function validateWord(w: Word, fileGroup: GroupId): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ severity: 'error', group: fileGroup, word: w.text, message });

  if (typeof w.text !== 'string' || !LOWER.test(w.text)) err(`text must be lowercase letters only: "${w.text}"`);
  if (w.group !== fileGroup) err(`group "${w.group}" does not match file group "${fileGroup}"`);
  if (!LEVELS.includes(w.level)) err(`level ${w.level} is not 1-4`);
  const meta = GROUPS[fileGroup];
  if (meta && w.level < meta.minLevel) err(`level ${w.level} is below the group's minimum level ${meta.minLevel}`);

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
      if (c.hint && new RegExp(`\\b${w.text}\\b`, 'i').test(c.hint)) {
        err(`hint for "${c.heard}" reveals the target word`);
      }
      if (w.homophones?.includes(c.heard)) err(`"${c.heard}" is both a homophone and a confusable`);
    }
  }

  if (w.sayAs && w.sayAs.length !== w.syllables.length) err('sayAs length must match syllables');

  // Level shape checks (soft rules from the spec).
  const n = w.syllables?.length ?? 0;
  if (fileGroup !== 'affixes') {
    if ((w.level === 1 || w.level === 2) && n !== 1) err(`level ${w.level} words must have 1 syllable, got ${n}`);
    if (w.level === 3 && n !== 2) err(`level 3 words must have 2 syllables, got ${n}`);
    if (w.level === 4 && n < 2) err(`level 4 words need 2+ syllables, got ${n}`);
  }
  if (fileGroup === 'cle' && !w.syllableTypes.includes('cle')) err('consonant-le word has no cle syllable');

  return issues;
}

export function validateContent(files: GroupFile[], minWordsPerLevel: number): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const counts: ValidationResult['counts'] = {};
  const seen = new Map<string, GroupId>();

  for (const file of files) {
    if (!GROUPS[file.group]) {
      errors.push({ severity: 'error', group: file.group, message: `unknown group "${file.group}"` });
      continue;
    }
    counts[file.group] = {};
    for (const w of file.words) {
      for (const issue of validateWord(w, file.group)) {
        (issue.severity === 'error' ? errors : warnings).push(issue);
      }
      const prev = seen.get(w.text);
      if (prev) {
        errors.push({ severity: 'error', group: file.group, word: w.text, message: `duplicate word (also in "${prev}")` });
      } else {
        seen.set(w.text, file.group);
      }
      const c = counts[file.group]!;
      c[w.level] = (c[w.level] ?? 0) + 1;
    }
  }

  for (const file of files) {
    const meta = GROUPS[file.group];
    if (!meta) continue;
    const c = counts[file.group] ?? {};
    for (const level of LEVELS) {
      if (level < meta.minLevel) continue;
      const n = c[level] ?? 0;
      if (n === 0) {
        warnings.push({ severity: 'warning', group: file.group, message: `level ${level} has no words (stub)` });
      } else if (n < minWordsPerLevel) {
        warnings.push({ severity: 'warning', group: file.group, message: `level ${level} has ${n} words, target is ${minWordsPerLevel}` });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, counts };
}
