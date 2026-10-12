import { SYLLABLE_LABELS, type SyllableType } from '../../content/schema';

const colors: Record<SyllableType, string> = {
  closed: 'bg-syl-closed',
  open: 'bg-syl-open',
  vce: 'bg-syl-vce',
  team: 'bg-syl-team',
  r: 'bg-syl-r',
  cle: 'bg-syl-cle',
  diphthong: 'bg-syl-diphthong',
  schwa: 'bg-syl-schwa',
};

export function SyllableTag({ type, text }: { type: SyllableType; text?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-white text-sm font-bold ${colors[type]}`}>
      {text ?? SYLLABLE_LABELS[type]}
    </span>
  );
}

export const syllableTextColor: Record<SyllableType, string> = {
  closed: 'text-syl-closed',
  open: 'text-syl-open',
  vce: 'text-syl-vce',
  team: 'text-syl-team',
  r: 'text-syl-r',
  cle: 'text-syl-cle',
  diphthong: 'text-syl-diphthong',
  schwa: 'text-syl-schwa',
};
