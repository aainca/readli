import { Emitter } from './Recognizer';

/**
 * Text-to-speech wrapper over the browser's speechSynthesis. Emits a
 * speaking flag so recognizers can pause while the app talks.
 */
const speaking = new Emitter<boolean>();
let isSpeaking = false;

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
  /** Speaks text and resolves when done. Cancels anything already speaking. */
  speak(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
    if (!tts.supported || !text.trim()) return Promise.resolve();
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = opts.rate ?? 0.85;
      u.pitch = opts.pitch ?? 1.05;
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
