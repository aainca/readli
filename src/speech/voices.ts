/**
 * Voice selection for the browser's text-to-speech.
 *
 * The voices available come from the device: Chrome ships "Google" online
 * voices, Windows has Microsoft voices (the "Natural" ones sound human),
 * macOS and iPad have Samantha and the Siri voices, Android has Google TTS.
 * We rank what is installed by how natural it sounds, pick by gender for the
 * chosen personality, and shape it with rate and pitch.
 */
export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  gender: 'female' | 'male' | 'unknown';
  /** Higher is more natural. */
  quality: number;
  local: boolean;
}

export type PresetId = 'maple' | 'oak' | 'sunny' | 'storyteller' | 'robo';

export interface VoicePreset {
  id: PresetId;
  label: string;
  emoji: string;
  description: string;
  prefer: 'female' | 'male' | 'any';
  rate: number;
  pitch: number;
  /** Robo picks the least natural voice on purpose. */
  silly?: boolean;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'maple', label: 'Maple', emoji: '🍁', description: 'warm, friendly woman', prefer: 'female', rate: 0.92, pitch: 1.0 },
  { id: 'oak', label: 'Oak', emoji: '🌳', description: 'calm, steady man', prefer: 'male', rate: 0.9, pitch: 0.95 },
  { id: 'sunny', label: 'Sunny', emoji: '🌞', description: 'bright and bubbly', prefer: 'female', rate: 1.05, pitch: 1.18 },
  { id: 'storyteller', label: 'Storyteller', emoji: '📖', description: 'slow and clear, for long words', prefer: 'any', rate: 0.78, pitch: 0.98 },
  { id: 'robo', label: 'Robo', emoji: '🤖', description: 'silly robot', prefer: 'any', rate: 0.95, pitch: 0.55, silly: true },
];

const FEMALE = ['aria', 'jenny', 'zira', 'samantha', 'karen', 'moira', 'tessa', 'victoria', 'allison', 'ava', 'susan', 'hazel', 'emma', 'ana', 'michelle', 'sonia', 'libby', 'natasha', 'nicole', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy', 'amy', 'female', 'woman', 'google us english', 'google uk english female'];
const MALE = ['guy', 'david', 'mark', 'daniel', 'alex', 'tom', 'fred', 'aaron', 'eddy', 'rishi', 'ryan', 'brian', 'christopher', 'eric', 'roger', 'steffan', 'andrew', 'matthew', 'joey', 'justin', 'kevin', 'male', 'man', 'google uk english male'];
const NATURAL = ['natural', 'neural', 'premium', 'enhanced', 'siri', 'online', 'google', 'samantha', 'aria', 'jenny', 'guy', 'andrew', 'emma', 'ava', 'brian'];
const ROBOTIC: [string, number][] = [['espeak', 5], ['compact', 3], ['fred', 3], ['zarvox', 4], ['trinoids', 4], ['whisper', 4], ['bad news', 4], ['bubbles', 4], ['cellos', 4], ['desktop', 2]];

export function describeVoice(v: SpeechSynthesisVoice): VoiceInfo {
  const n = v.name.toLowerCase();
  const gender = FEMALE.some((k) => n.includes(k)) ? 'female' : MALE.some((k) => n.includes(k)) ? 'male' : 'unknown';
  let quality = 1;
  for (const k of NATURAL) if (n.includes(k)) quality += 2;
  for (const [k, penalty] of ROBOTIC) if (n.includes(k)) quality -= penalty;
  if (n.includes('natural') || n.includes('neural')) quality += 3;
  if (/^en-?us/i.test(v.lang) || v.lang === 'en_US') quality += 1;
  return { uri: v.voiceURI, name: v.name, lang: v.lang, gender, quality, local: v.localService };
}

/** English voices on this device, best first. Empty until the browser has loaded its voices. */
export function listVoices(): VoiceInfo[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => /^en/i.test(v.lang))
    .map(describeVoice)
    .sort((a, b) => b.quality - a.quality || a.name.localeCompare(b.name));
}

/** Resolves a preset to a concrete voice from the given list. */
export function pickVoice(preset: VoicePreset, voices: VoiceInfo[]): VoiceInfo | null {
  if (voices.length === 0) return null;
  if (preset.silly) return [...voices].sort((a, b) => a.quality - b.quality)[0] ?? null;
  const byGender = preset.prefer === 'any' ? voices : voices.filter((v) => v.gender === preset.prefer);
  return byGender[0] ?? voices.find((v) => v.gender === 'unknown') ?? voices[0] ?? null;
}

/** Calls back once the browser has its voice list (some load asynchronously). */
export function onVoicesReady(cb: (voices: VoiceInfo[]) => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {};
  const fire = () => cb(listVoices());
  const now = listVoices();
  if (now.length) fire();
  window.speechSynthesis.addEventListener('voiceschanged', fire);
  // Some browsers never fire the event; poll briefly.
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (listVoices().length || tries > 20) {
      clearInterval(timer);
      if (listVoices().length && !now.length) fire();
    }
  }, 250);
  return () => {
    window.speechSynthesis.removeEventListener('voiceschanged', fire);
    clearInterval(timer);
  };
}

/** Plain-language tip on getting a more natural voice on this device. */
export function naturalVoiceTip(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPad|iPhone/.test(ua)) return 'On an iPad the Siri and Samantha voices sound best. Settings › Accessibility › Spoken Content › Voices lets you download higher-quality English voices.';
  if (/Android/.test(ua)) return 'On Android, open Settings › General › Text-to-speech output and install or update Google Speech Services for more natural voices.';
  if (/Windows/.test(ua)) return 'On Windows, the voices named "Natural" sound human. Settings › Time & language › Speech › Add voices installs them; Chrome also offers Google online voices when connected.';
  if (/Macintosh/.test(ua)) return 'On a Mac, System Settings › Accessibility › Spoken Content › System voice lets you download Premium and Enhanced English voices, which sound far more natural.';
  return 'Voices come from the device. Install a higher-quality English voice in the system settings and it will appear here.';
}
