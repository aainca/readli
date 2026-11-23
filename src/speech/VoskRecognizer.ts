import type { KaldiRecognizer, Model } from 'vosk-browser';
import { Emitter, type RecognitionResult, type Recognizer, type RecognizerError } from './Recognizer';
import { tts } from './tts';

/**
 * Offline speech recognition in the browser with Vosk (Kaldi compiled to
 * WebAssembly). The model (31 MB) downloads once and is cached. No audio
 * leaves the device and no keys are needed.
 *
 * Why it recognizes single words better than the browser engine: each word
 * is listened for with a grammar (the target, its homophones and confusables,
 * a few distractors, and [unk] for anything else), so the decoder is not
 * guessing a phrase from the whole language.
 */
export const VOSK_MODEL_URL = '/models/vosk-small-en-us.tar.gz';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'failed';

const status = new Emitter<{ status: EngineStatus; progress: number; error?: string }>();
let current: { status: EngineStatus; progress: number; error?: string } = { status: 'idle', progress: 0 };
let modelPromise: Promise<Model> | null = null;

function setStatus(next: typeof current): void {
  current = next;
  status.emit(next);
}

/** Downloads the model with progress, then hands the cached URL to Vosk. */
async function fetchModelWithProgress(url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length') ?? 0);
  const reader = res.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value?.length ?? 0;
    setStatus({ status: 'loading', progress: total ? Math.min(0.95, got / total) : 0.5 });
  }
}

export function loadVoskModel(): Promise<Model> {
  if (modelPromise) return modelPromise;
  setStatus({ status: 'loading', progress: 0 });
  modelPromise = (async () => {
    try {
      await fetchModelWithProgress(VOSK_MODEL_URL);
      // The library is 6 MB (WebAssembly worker inside): load it only when needed.
      const { createModel } = await import('vosk-browser');
      const model = await createModel(VOSK_MODEL_URL);
      setStatus({ status: 'ready', progress: 1 });
      return model;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ status: 'failed', progress: 0, error: message });
      modelPromise = null;
      throw err;
    }
  })();
  return modelPromise;
}

export const voskEngine = {
  get status() { return current; },
  onStatus(cb: (s: typeof current) => void): () => void { return status.on(cb); },
  supported(): boolean {
    return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof Worker !== 'undefined';
  },
};

export class VoskRecognizer implements Recognizer {
  readonly name = 'vosk';
  readonly hearsSpeech = true;

  private model: Model | null = null;
  private rec: KaldiRecognizer | null = null;
  private grammar: string[] | null = null;
  private wanted = false;
  private active = false;
  private disposed = false;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private results = new Emitter<RecognitionResult>();
  private interim = new Emitter<string>();
  private state = new Emitter<boolean>();
  private errors = new Emitter<RecognizerError>();
  private offTts: () => void;
  private deviceId: string | undefined;

  constructor(opts: { deviceId?: string } = {}) {
    this.deviceId = opts.deviceId && opts.deviceId !== 'default' ? opts.deviceId : undefined;
    // Pause while the app talks: drop chunks rather than tear the pipeline down.
    this.offTts = tts.onSpeaking(() => { /* handled per chunk via tts.speaking */ });
  }

  setGrammar(words: string[] | null): void {
    const next = words ? [...new Set(words.map((w) => w.toLowerCase().trim()).filter(Boolean))] : null;
    const same = JSON.stringify(next) === JSON.stringify(this.grammar);
    this.grammar = next;
    if (!same && this.model) this.rebuildRecognizer();
  }

  start(): void {
    if (this.disposed) return;
    this.wanted = true;
    if (this.active) return;
    void this.open();
  }

  stop(): void {
    this.wanted = false;
    this.close();
  }

  onResult(cb: (r: RecognitionResult) => void): () => void { return this.results.on(cb); }
  onInterim(cb: (text: string) => void): () => void { return this.interim.on(cb); }
  onState(cb: (listening: boolean) => void): () => void { return this.state.on(cb); }
  onError(cb: (e: RecognizerError) => void): () => void { return this.errors.on(cb); }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.offTts();
    this.rec?.remove();
    this.rec = null;
    this.results.clear();
    this.interim.clear();
    this.state.clear();
    this.errors.clear();
  }

  private async open(): Promise<void> {
    try {
      this.model ??= await loadVoskModel();
      if (!this.wanted || this.disposed) return;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: this.deviceId ? { deviceId: { exact: this.deviceId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
      });
      if (!this.wanted || this.disposed) { this.close(); return; }
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.rebuildRecognizer();
      const source = this.ctx.createMediaStreamSource(this.stream);
      this.node = this.ctx.createScriptProcessor(4096, 1, 1);
      this.node.onaudioprocess = (e) => {
        if (!this.rec || !this.active || tts.speaking) return;
        const data = e.inputBuffer.getChannelData(0);
        this.rec.acceptWaveformFloat(new Float32Array(data), e.inputBuffer.sampleRate);
      };
      source.connect(this.node);
      this.node.connect(this.ctx.destination);
      this.active = true;
      this.state.emit(true);
    } catch (err) {
      const name = (err as { name?: string }).name ?? 'error';
      const message = err instanceof Error ? err.message : String(err);
      const fatal = name === 'NotAllowedError' || name === 'NotFoundError' || name === 'NotReadableError' || current.status === 'failed';
      this.errors.emit({
        code: name === 'NotAllowedError' ? 'not-allowed' : name === 'NotFoundError' ? 'audio-capture' : current.status === 'failed' ? 'model' : name,
        message:
          name === 'NotAllowedError' ? 'The microphone is blocked. Allow it in the browser address bar, or judge the words yourself with the buttons below.'
          : name === 'NotFoundError' ? 'No microphone was found. Judge the words yourself with the buttons below.'
          : current.status === 'failed' ? `The offline voice engine could not load (${message}). Falling back.`
          : message,
        fatal,
      });
      this.close();
    }
  }

  private rebuildRecognizer(): void {
    if (!this.model || !this.ctx) return;
    this.rec?.remove();
    const grammar = this.grammar ? JSON.stringify([...this.grammar, '[unk]']) : undefined;
    this.rec = new this.model.KaldiRecognizer(this.ctx.sampleRate, grammar);
    this.rec.setWords(true);
    this.rec.on('result', (m) => {
      if (m.event !== 'result') return;
      const text = m.result.text.trim();
      if (!text || text === '[unk]') return;
      this.results.emit({ alternatives: [text.replace(/\[unk\]/g, ' ').trim()] });
    });
    this.rec.on('partialresult', (m) => {
      if (m.event !== 'partialresult') return;
      const partial = m.result.partial.replace(/\[unk\]/g, ' ').trim();
      if (partial) this.interim.emit(partial);
    });
    this.rec.on('error', (m) => {
      if (m.event === 'error') this.errors.emit({ code: 'engine', message: m.error, fatal: false });
    });
  }

  private close(): void {
    const was = this.active;
    this.active = false;
    try { this.node?.disconnect(); } catch { /* ignore */ }
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx) { void this.ctx.close().catch(() => {}); this.ctx = null; }
    this.rec?.remove();
    this.rec = null;
    if (was) this.state.emit(false);
  }
}
