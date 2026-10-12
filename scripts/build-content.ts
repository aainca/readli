/**
 * Builds src/content/groups/<group>.json from src/content/source/<group>.txt.
 * Run: npm run content:build
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSource } from '../src/content/source';
import { GROUP_IDS, type GroupFile } from '../src/content/schema';

const root = resolve(import.meta.dirname, '..');
const srcDir = resolve(root, 'src/content/source');
const outDir = resolve(root, 'src/content/groups');
mkdirSync(outDir, { recursive: true });

let total = 0;
for (const group of GROUP_IDS) {
  const srcPath = resolve(srcDir, `${group}.txt`);
  const words = existsSync(srcPath) ? parseSource(group, readFileSync(srcPath, 'utf8')) : [];
  const file: GroupFile = { group, words };
  writeFileSync(resolve(outDir, `${group}.json`), JSON.stringify(file, null, 2) + '\n');
  total += words.length;
  console.log(`${group.padEnd(10)} ${String(words.length).padStart(4)} words`);
}
console.log(`total      ${String(total).padStart(4)} words`);
