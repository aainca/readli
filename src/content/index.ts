import { GROUP_IDS, type GroupFile, type GroupId, type Level, type Word } from './schema';
import closed from './groups/closed.json';
import open from './groups/open.json';
import vce from './groups/vce.json';
import team from './groups/team.json';
import r from './groups/r.json';
import cle from './groups/cle.json';
import diphthong from './groups/diphthong.json';
import softcg from './groups/softcg.json';
import yvowel from './groups/yvowel.json';
import schwa from './groups/schwa.json';
import affixes from './groups/affixes.json';

const files: Record<GroupId, GroupFile> = {
  closed: closed as GroupFile,
  open: open as GroupFile,
  vce: vce as GroupFile,
  team: team as GroupFile,
  r: r as GroupFile,
  cle: cle as GroupFile,
  diphthong: diphthong as GroupFile,
  softcg: softcg as GroupFile,
  yvowel: yvowel as GroupFile,
  schwa: schwa as GroupFile,
  affixes: affixes as GroupFile,
};

export const allGroupFiles: GroupFile[] = GROUP_IDS.map((g) => files[g]);
export const allWords: Word[] = allGroupFiles.flatMap((f) => f.words);

const byText = new Map(allWords.map((w) => [w.text, w]));

export function getWord(text: string): Word | undefined {
  return byText.get(text);
}

export function wordsFor(group: GroupId, level?: Level): Word[] {
  const words = files[group].words;
  return level === undefined ? words : words.filter((w) => w.level === level);
}

export function levelsAvailable(group: GroupId): Level[] {
  const set = new Set(files[group].words.map((w) => w.level));
  return [...set].sort() as Level[];
}
