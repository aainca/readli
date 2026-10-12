import { Emitter, type RecognitionResult, type Recognizer, type RecognizerError } from './Recognizer';
import { tts } from './tts';

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Errors after which we stop retrying and switch to manual mode. */
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported', 'bad-grammar']);

export const FATAL_MESSAGES: Record<string, string> = {
  'not-allowed': 'The microphone is blocked. Allow it in the browser address bar, or judge the words yourself with the buttons below.',
  'service-not-allowed': 'Speech recognition is not available in this browser. Judge the words yourself with the buttons below.',
  'audio-capture': 'No microphone was found. Judge the words yourself with the buttons below.',
  'language-not-supported': 'Speech recognition for English is not available here. Judge the words yourself with the buttons below.',
  'bad-grammar': 'Speech recognition failed to start. Judge the words yourself with the buttons below.',
};

/**
 * Browser Web Speech API recognizer.
 * - maxAlternatives 5, en-US, interim results only for display.
 * - Starts only when start() is called (after a user tap).
 * - Pauses while TTS speaks and resumes after.
 * - Restarts itself after a result or silence while wanted, so a session
 *   never ends in a stuck state. Fatal errors stop retrying.
 */
export class WebSpeechRecognizer implements Recognizer {
  readonly name = 'web-speech';
  readonly hearsSpeech = true;

  private rec: SpeechRecognitionLike;
  private wanted = false;
  private active = false;
  private disposed = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveNetworkErrors = 0;
  private results = new Emitter<RecognitionResult>();
  private interim = new Emitter<string>();
  private state = new Emitter<boolean>();
  private errors = new Emitter<RecognizerError>();
  private offTts: () => void;

  constructor(ctor: SpeechRecognitionCtor = getSpeechRecognitionCtor()!) {
    this.rec = new ctor();
    this.rec.lang = 'en-US';
    this.rec.continuous = false;
    this.rec.interimResults = true;
    this.rec.maxAlternatives = 5;

    this.rec.onstart = () => {
      this.active = true;
      this.state.emit(true);
    };
    this.rec.onend = () => {
      this.active = false;
      this.state.emit(false);
      if (this.wanted && !tts.speaking) this.scheduleRestart(250);
    };
    this.rec.onerror = (e) => {
      const code = e.error;
      if (FATAL.has(code)) {
        this.wanted = false;
        this.errors.emit({ code, message: FATAL_MESSAGES[code] ?? e.message ?? code, fatal: true });
        return;
      }
      if (code === 'network') {
        this.consecutiveNetworkErrors += 1;
        if (this.consecutiveNetworkErrors >= 3) {
          this.wanted = false;
          this.errors.emit({ code, message: 'Speech recognition keeps failing to reach its service. Judge the words yourself with the buttons below.', fatal: true });
          return;
        }
      }
      // 'no-speech' and 'aborted' are routine; onend handles the restart.
      this.errors.emit({ code, message: e.message ?? code, fatal: false });
    };
    this.rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) {
          const alternatives: string[] = [];
          for (let j = 0; j < r.length; j++) alternatives.push(r[j]!.transcript);
          this.consecutiveNetworkErrors = 0;
          this.results.emit({ alternatives });
        } else {
          interimText += r[0]?.transcript ?? '';
        }
      }
      if (interimText) this.interim.emit(interimText.trim());
    };

    this.offTts = tts.onSpeaking((speaking) => {
      if (speaking) {
        if (this.active) this.safeAbort();
      } else if (this.wanted) {
        this.scheduleRestart(200);
      }
    });
  }

  static available(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  start(): void {
    if (this.disposed) return;
    this.wanted = true;
    if (tts.speaking || this.active) return;
    this.safeStart();
  }

  stop(): void {
    this.wanted = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    if (this.active) this.safeAbort();
  }

  onResult(cb: (r: RecognitionResult) => void): () => void { return this.results.on(cb); }
  onInterim(cb: (text: string) => void): () => void { return this.interim.on(cb); }
  onState(cb: (listening: boolean) => void): () => void { return this.state.on(cb); }
  onError(cb: (e: RecognizerError) => void): () => void { return this.errors.on(cb); }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.offTts();
    this.results.clear();
    this.interim.clear();
    this.state.clear();
    this.errors.clear();
  }

  private scheduleRestart(ms: number): void {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (this.wanted && !this.active && !tts.speaking && !this.disposed) this.safeStart();
    }, ms);
  }

  private safeStart(): void {
    try {
      this.rec.start();
    } catch {
      // Already started; the next onend will restart it if still wanted.
    }
  }

  private safeAbort(): void {
    try {
      this.rec.abort();
    } catch {
      // ignore
    }
  }
}
