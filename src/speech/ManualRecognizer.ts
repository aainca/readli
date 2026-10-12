import { Emitter, type RecognitionResult, type Recognizer, type RecognizerError } from './Recognizer';

/**
 * Parent-judged mode. Produces no speech results; the parent taps
 * "I heard it right" or "Not quite", which go straight to the attempt.
 * start/stop only toggle the listening indicator.
 */
export class ManualRecognizer implements Recognizer {
  readonly name = 'manual';
  readonly hearsSpeech = false;
  private listening = false;
  private state = new Emitter<boolean>();

  start(): void {
    if (this.listening) return;
    this.listening = true;
    this.state.emit(true);
  }
  stop(): void {
    if (!this.listening) return;
    this.listening = false;
    this.state.emit(false);
  }
  onResult(_cb: (r: RecognitionResult) => void): () => void { return () => {}; }
  onInterim(_cb: (text: string) => void): () => void { return () => {}; }
  onState(cb: (listening: boolean) => void): () => void { return this.state.on(cb); }
  onError(_cb: (e: RecognizerError) => void): () => void { return () => {}; }
  dispose(): void {
    this.stop();
    this.state.clear();
  }
}
