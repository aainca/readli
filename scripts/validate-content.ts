/**
 * Validates every word in src/content/skills. Exits non-zero on errors.
 * Run: npm run content:validate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateContent } from '../src/content/validate';
import { config } from '../src/engine/config';
import { SKILLS, type Level, type SkillFile, type SkillId } from '../src/content/schema';

const dir = resolve(import.meta.dirname, '../src/content/skills');
const files: SkillFile[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as SkillFile);

const result = validateContent(files, {
  minWordsPerLevel: config.content.minWordsPerLevel,
  heldOutPerLevel: config.placement.heldOutPerLevel,
});

for (const w of result.warnings) console.log(`warning  ${w.skillId}${w.word ? ' ' + w.word : ''}: ${w.message}`);
for (const e of result.errors) console.log(`ERROR    ${e.skillId}${e.word ? ' ' + e.word : ''}: ${e.message}`);

console.log('\nskill  practice words (+ held-out test words) per level');
for (const [id, c] of Object.entries(result.counts)) {
  const meta = SKILLS[id as SkillId];
  const cells = meta.levels.map((l: Level) => {
    const lc = c[l] ?? { practice: 0, heldOut: 0 };
    return `${String(l).padStart(1)}: ${String(lc.practice).padStart(3)}+${lc.heldOut}`;
  });
  console.log(`${id.padEnd(6)} ${cells.join('   ')}`);
}
console.log(`\n${result.errors.length} errors, ${result.warnings.length} warnings`);
process.exit(result.ok ? 0 : 1);
