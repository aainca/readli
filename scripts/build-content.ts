/**
 * Builds src/content/skills/<slug>.json from src/content/source/<slug>.txt.
 * Skills without a source file get an empty stub file.
 * Run: npm run content:build
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSource } from '../src/content/source';
import { SKILLS, SKILL_IDS, type SkillFile } from '../src/content/schema';

const root = resolve(import.meta.dirname, '..');
const srcDir = resolve(root, 'src/content/source');
const outDir = resolve(root, 'src/content/skills');
mkdirSync(outDir, { recursive: true });

let total = 0;
for (const skillId of SKILL_IDS) {
  const slug = SKILLS[skillId].slug;
  const srcPath = resolve(srcDir, `${slug}.txt`);
  const words = existsSync(srcPath) ? parseSource(skillId, readFileSync(srcPath, 'utf8')) : [];
  const file: SkillFile = { skillId, words };
  writeFileSync(resolve(outDir, `${slug}.json`), JSON.stringify(file, null, 2) + '\n');
  total += words.length;
  console.log(`${skillId.padEnd(5)} ${slug.padEnd(24)} ${String(words.length).padStart(4)} words`);
}
console.log(`total ${''.padEnd(24)} ${String(total).padStart(4)} words`);
