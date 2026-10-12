/**
 * The swappable recognizer interface. Implementations arrive in Phase 2:
 * WebSpeechRecognizer, ManualRecognizer; optionally a cloud engine in Phase 7.
 */
export interface RecognitionResult {
  /** Alternatives, best first. */
  alternatives: string[];
  isFinal: boolean;
}

export interface Recognizer {
  readonly name: string;
  /** Whether this recognizer produces speech results at all (Manual does not). */
  readonly hearsSpeech: boolean;
  start(): Promise<void>;
  stop(): void;
  onResult(cb: (r: RecognitionResult) => void): () => void;
  onError(cb: (code: string, message: string) => void): () => void;
}
