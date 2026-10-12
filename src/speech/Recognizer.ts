/**
 * The swappable recognizer interface. Implementations: WebSpeechRecognizer
 * (browser Web Speech API) and ManualRecognizer (parent judges). A cloud
 * engine may be added in Phase 7 behind an opt-in setting.
 */
export interface RecognitionResult {
  /** Final alternatives, best first. */
  alternatives: string[];
}

export interface RecognizerError {
  code: string;
  message: string;
  /** When true the recognizer cannot continue and the app should switch to manual mode. */
  fatal: boolean;
}

export interface Recognizer {
  readonly name: string;
  /** Whether this recognizer produces speech results at all (Manual does not). */
  readonly hearsSpeech: boolean;
  /** Begin listening. Call only after a user tap. */
  start(): void;
  stop(): void;
  /** Final results. */
  onResult(cb: (r: RecognitionResult) => void): () => void;
  /** Interim text, for the "heard" display only. Never used for judging. */
  onInterim(cb: (text: string) => void): () => void;
  /** Listening state changes. */
  onState(cb: (listening: boolean) => void): () => void;
  onError(cb: (e: RecognizerError) => void): () => void;
  dispose(): void;
}

export class Emitter<T> {
  private cbs = new Set<(v: T) => void>();
  on(cb: (v: T) => void): () => void {
    this.cbs.add(cb);
    return () => this.cbs.delete(cb);
  }
  emit(v: T): void {
    for (const cb of [...this.cbs]) cb(v);
  }
  clear(): void {
    this.cbs.clear();
  }
}
