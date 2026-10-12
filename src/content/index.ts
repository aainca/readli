import { SKILL_IDS, SKILLS, type Level, type SkillFile, type SkillId, type Word } from './schema';

/**
 * All skill files, loaded eagerly. Vite bundles every JSON under skills/.
 * Stubs for V2 skills are empty files so navigation can list them.
 */
const modules = import.meta.glob<SkillFile>('./skills/*.json', { eager: true, import: 'default' });

const files = new Map<SkillId, SkillFile>();
for (const skillId of SKILL_IDS) {
  const file = modules[`./skills/${SKILLS[skillId].slug}.json`];
  files.set(skillId, file ?? { skillId, words: [] });
}

export const allSkillFiles: SkillFile[] = SKILL_IDS.map((id) => files.get(id)!);
export const allWords: Word[] = allSkillFiles.flatMap((f) => f.words);

const byText = new Map(allWords.map((w) => [w.text, w]));

export function getWord(text: string): Word | undefined {
  return byText.get(text);
}

export interface WordsForOptions {
  /** 'practice' (default) excludes held-out test words; 'test' returns only them; 'all' returns both. */
  pool?: 'practice' | 'test' | 'all';
}

export function wordsFor(skillId: SkillId, level?: Level, options: WordsForOptions = {}): Word[] {
  const pool = options.pool ?? 'practice';
  return files.get(skillId)!.words.filter(
    (w) =>
      (level === undefined || w.level === level) &&
      (pool === 'all' || (pool === 'test') === Boolean(w.heldOut)),
  );
}

export function levelsAvailable(skillId: SkillId): Level[] {
  const present = new Set(files.get(skillId)!.words.map((w) => w.level));
  return SKILLS[skillId].levels.filter((l) => present.has(l));
}
