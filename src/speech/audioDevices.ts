import { getSpeechRecognitionCtor } from './WebSpeechRecognizer';

/**
 * Device detection and diagnostics for the Audio setup screen.
 *
 * Chrome's Web Speech API always records from the system default microphone
 * and speechSynthesis always plays through the default output. A page cannot
 * redirect either. What this module can do: ask for permission the reliable
 * way (getUserMedia), list the devices, meter a chosen microphone so the
 * parent can see which one hears the child, play a test phrase, and run a
 * short recognition test that reports the real error code.
 */
export interface AudioDevice {
  id: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export async function microphonePermission(): Promise<PermissionState> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'unknown';
  }
}

export interface PermissionResult {
  ok: boolean;
  /** NotAllowedError, NotFoundError, NotReadableError, OverconstrainedError, SecurityError */
  error?: string;
  message: string;
}

export const PERMISSION_MESSAGES: Record<string, string> = {
  NotAllowedError: 'The microphone is blocked for this site. Tap the lock icon next to the address, set Microphone to Allow, then reload.',
  NotFoundError: 'No microphone was found. Check that one is connected and that the device settings allow the browser to use it.',
  NotReadableError: 'The microphone is in use by another app, or the device blocks the browser from using it. Close other apps that use the mic, or check the system privacy settings.',
  OverconstrainedError: 'The selected microphone is no longer available. Pick another one.',
  SecurityError: 'The page is not on a secure (https) address, so the browser will not allow the microphone.',
};

/** Asks for permission by opening the microphone for a moment. Unlocks device labels. */
export async function requestMicrophone(deviceId?: string): Promise<PermissionResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'Unsupported', message: 'This browser cannot access microphones. Use Chrome.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, message: 'Microphone allowed.' };
  } catch (err) {
    const name = (err as { name?: string }).name ?? 'Error';
    return { ok: false, error: name, message: PERMISSION_MESSAGES[name] ?? `Microphone error: ${name}` };
  }
}

export async function listDevices(): Promise<AudioDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  const out: AudioDevice[] = [];
  const counts = { audioinput: 0, audiooutput: 0 };
  for (const d of all) {
    if (d.kind !== 'audioinput' && d.kind !== 'audiooutput') continue;
    counts[d.kind] += 1;
    const base = d.kind === 'audioinput' ? 'Microphone' : 'Speaker';
    out.push({
      id: d.deviceId,
      label: d.label || `${base} ${counts[d.kind]}`,
      kind: d.kind,
      isDefault: d.deviceId === 'default' || /default/i.test(d.label),
    });
  }
  return out;
}

export function onDeviceChange(cb: () => void): () => void {
  const md = navigator.mediaDevices;
  if (!md?.addEventListener) return () => {};
  md.addEventListener('devicechange', cb);
  return () => md.removeEventListener('devicechange', cb);
}

/** Streams a 0..1 input level for a microphone until stopped. */
export async function meterMicrophone(deviceId: string | undefined, onLevel: (level: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true });
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) {
      const x = (v - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    onLevel(Math.min(1, rms * 4));
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
}

export interface RecognitionTest {
  ok: boolean;
  heard?: string;
  error?: string;
  message: string;
}

export const RECOGNITION_MESSAGES: Record<string, string> = {
  'not-allowed': 'Speech recognition was blocked. Allow the microphone for this site (lock icon next to the address) and try again.',
  'service-not-allowed': 'This browser does not allow its speech service here. Use Chrome, signed in or not, on a normal (not incognito) window.',
  'audio-capture': 'No microphone could be opened for speech. Check the microphone section above.',
  network: 'The speech service could not be reached. Chrome sends audio to Google to recognize it, so the device needs internet access. Some browsers (Brave, Chromium builds) have no speech service at all.',
  'no-speech': 'Nothing was heard in 5 seconds. Speak closer to the microphone, or check the level meter above moves when you talk.',
  aborted: 'The test was stopped.',
  unavailable: 'This browser has no speech recognition. On a tablet use Chrome on Android, or Safari on iPad with Siri and Dictation turned on.',
};

/** Runs one short recognition and reports what happened. */
export function testRecognition(timeoutMs = 6000): Promise<RecognitionTest> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return Promise.resolve({ ok: false, error: 'unavailable', message: RECOGNITION_MESSAGES.unavailable! });
  return new Promise((resolve) => {
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let done = false;
    const finish = (r: RecognitionTest) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { rec.abort(); } catch { /* ignore */ }
      resolve(r);
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'no-speech', message: RECOGNITION_MESSAGES['no-speech']! }), timeoutMs);
    rec.onresult = (e) => {
      const r = e.results[0];
      const text = r?.[0]?.transcript ?? '';
      finish({ ok: true, heard: text, message: `Heard: "${text}"` });
    };
    rec.onerror = (e) => finish({ ok: false, error: e.error, message: RECOGNITION_MESSAGES[e.error] ?? `Speech error: ${e.error}` });
    rec.onend = () => finish({ ok: false, error: 'no-speech', message: RECOGNITION_MESSAGES['no-speech']! });
    try {
      rec.start();
    } catch (err) {
      finish({ ok: false, error: 'start-failed', message: `Could not start: ${(err as Error).message}` });
    }
  });
}
