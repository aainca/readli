import { Emitter } from './Recognizer';
import { listVoices, pickVoice, VOICE_PRESETS, type PresetId, type VoicePreset } from './voices';

/**
 * Text-to-speech wrapper over the browser's speechSynthesis. Emits a
 * speaking flag so recognizers can pause while the app talks.
 */
const speaking = new Emitter<boolean>();
let isSpeaking = false;

/** Current voice choice: a preset, optionally pinned to one exact voice. */
let preset: VoicePreset = VOICE_PRESETS[0]!;
let pinnedVoiceUri: string | null = null;

function resolveVoice(): SpeechSynthesisVoice | null {
  if (!tts.supported) return null;
  const all = window.speechSynthesis.getVoices();
  if (pinnedVoiceUri) {
    const v = all.find((x) => x.voiceURI === pinnedVoiceUri);
    if (v) return v;
  }
  const info = pickVoice(preset, listVoices());
  return info ? all.find((x) => x.voiceURI === info.uri) ?? null : null;
}

export const tts = {
  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
  get speaking(): boolean {
    return isSpeaking;
  },
  onSpeaking(cb: (speaking: boolean) => void): () => void {
    return speaking.on(cb);
  },
  /** Chooses the voice personality; `voiceUri` pins one exact installed voice. */
  setVoice(presetId: PresetId, voiceUri: string | null = null): void {
    preset = VOICE_PRESETS.find((p) => p.id === presetId) ?? VOICE_PRESETS[0]!;
    pinnedVoiceUri = voiceUri;
  },
  get voice(): { preset: VoicePreset; voiceUri: string | null; resolved: string | null } {
    return { preset, voiceUri: pinnedVoiceUri, resolved: resolveVoice()?.name ?? null };
  },
  /** Speaks text and resolves when done. Cancels anything already speaking. */
  speak(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
    if (!tts.supported || !text.trim()) return Promise.resolve();
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      const voice = resolveVoice();
      if (voice) {
        try { u.voice = voice; } catch { /* leave the default voice */ }
      }
      // The caller's rate is relative (0.75 = slower for syllables); the preset shapes it.
      u.rate = Math.max(0.5, Math.min(2, (opts.rate ?? 0.9) * preset.rate / 0.9));
      u.pitch = Math.max(0, Math.min(2, (opts.pitch ?? 1) * preset.pitch));
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        isSpeaking = false;
        speaking.emit(false);
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      isSpeaking = true;
      speaking.emit(true);
      window.speechSynthesis.speak(u);
      // Safety net: some browsers never fire onend after cancel().
      setTimeout(done, 1000 + text.length * 120);
    });
  },
  cancel(): void {
    if (!tts.supported) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      isSpeaking = false;
      speaking.emit(false);
    }
  },
};
