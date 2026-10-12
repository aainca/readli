/**
 * Break It Down coach wording. The same lines are shown and spoken every
 * time so they become a habit. Parents can edit this file.
 */
export const COACH_PROMPTS = {
  /** Prompt 1 */
  vowels: 'Find the vowels.',
  /** Prompt 2 */
  between: 'Look between the vowels. How many consonants?',
  /** Prompt 3 */
  split: 'Where does it split?',
  /** Prompt 4 */
  read: 'Read each part.',
  /** Prompt 5 */
  blend: 'Now blend it.',
  /** Prompt 6 */
  check: 'Does it sound like a real word?',
  tryOther: 'Try the other vowel sound.',
  /** One-line reminder after the coach fades. */
  reminder: 'Vowels, split, read, blend.',

  /* Feedback lines */
  consonantTap: 'That one is a consonant.',
  vowelsFound: (n: number) => (n === 1 ? 'One vowel.' : `${n} vowels.`),
  betweenCount: (n: number) => (n === 0 ? 'No consonants between them.' : n === 1 ? 'One consonant.' : `${n} consonants.`),
  splitRight: 'Yes!',
  splitWrong: 'Not there. Here it is.',
  allSplitsFound: 'All split.',
} as const;
