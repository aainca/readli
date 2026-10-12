/**
 * Validates every word in src/content/groups. Exits non-zero on errors.
 * Run: npm run content:validate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateContent } from '../src/content/validate';
import { config } from '../src/engine/config';
import type { GroupFile } from '../src/content/schema';

const dir = resolve(import.meta.dirname, '../src/content/groups');
const files: GroupFile[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as GroupFile);

const result = validateContent(files, config.content.minWordsPerLevel);

for (const w of result.warnings) console.log(`warning  ${w.group}${w.word ? ' ' + w.word : ''}: ${w.message}`);
for (const e of result.errors) console.log(`ERROR    ${e.group}${e.word ? ' ' + e.word : ''}: ${e.message}`);

console.log('\ngroup       L1   L2   L3   L4');
for (const [g, c] of Object.entries(result.counts)) {
  console.log(`${g.padEnd(10)} ${[1, 2, 3, 4].map((l) => String(c[l as 1 | 2 | 3 | 4] ?? 0).padStart(4)).join(' ')}`);
}
console.log(`\n${result.errors.length} errors, ${result.warnings.length} warnings`);
process.exit(result.ok ? 0 : 1);
