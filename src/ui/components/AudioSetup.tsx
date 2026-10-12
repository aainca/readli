import { useEffect, useRef, useState } from 'react';
import {
  listDevices, meterMicrophone, microphonePermission, onDeviceChange, requestMicrophone, testRecognition,
  type AudioDevice, type PermissionResult, type PermissionState, type RecognitionTest,
} from '../../speech/audioDevices';
import { tts } from '../../speech/tts';
import { getSetting, setSetting, settingKeys } from '../../store/settings';

/**
 * Audio setup: permission, auto-detected devices, a live mic meter, a speaker
 * test and a speech recognition test with plain-language diagnosis.
 */
export function AudioSetup({ onClose }: { onClose: () => void }) {
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [permResult, setPermResult] = useState<PermissionResult | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [mic, setMic] = useState<string>('');
  const [speaker, setSpeaker] = useState<string>('');
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [meterError, setMeterError] = useState<string | null>(null);
  const [recTest, setRecTest] = useState<RecognitionTest | null>(null);
  const [testing, setTesting] = useState(false);
  const stopMeter = useRef<(() => void) | null>(null);
  const peakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = async () => {
    setPermission(await microphonePermission());
    const list = await listDevices();
    setDevices(list);
    const savedMic = await getSetting<string>(settingKeys.micDeviceId, '');
    const savedSpk = await getSetting<string>(settingKeys.speakerDeviceId, '');
    const mics = list.filter((d) => d.kind === 'audioinput');
    const spks = list.filter((d) => d.kind === 'audiooutput');
    setMic((cur) => cur || (mics.some((d) => d.id === savedMic) ? savedMic : (mics.find((d) => d.isDefault) ?? mics[0])?.id ?? ''));
    setSpeaker((cur) => cur || (spks.some((d) => d.id === savedSpk) ? savedSpk : (spks.find((d) => d.isDefault) ?? spks[0])?.id ?? ''));
  };

  const askPermission = async () => {
    const r = await requestMicrophone();
    setPermResult(r);
    await refresh();
  };

  // Auto-detect on open: ask once if needed, list devices, watch for plug/unplug.
  useEffect(() => {
    void (async () => {
      const state = await microphonePermission();
      setPermission(state);
      if (state !== 'denied') await askPermission();
      else await refresh();
    })();
    const off = onDeviceChange(() => void refresh());
    return () => {
      off();
      stopMeter.current?.();
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meter follows the chosen microphone.
  useEffect(() => {
    stopMeter.current?.();
    stopMeter.current = null;
    setLevel(0);
    setPeak(0);
    setMeterError(null);
    if (permission === 'denied' || devices.filter((d) => d.kind === 'audioinput').length === 0) return;
    let cancelled = false;
    meterMicrophone(mic || undefined, (l) => {
      setLevel(l);
      if (l > 0.08) {
        setPeak(l);
        if (peakTimer.current) clearTimeout(peakTimer.current);
        peakTimer.current = setTimeout(() => setPeak(0), 1500);
      }
    })
      .then((stop) => {
        if (cancelled) stop();
        else stopMeter.current = stop;
      })
      .catch((err: { name?: string }) => setMeterError(err.name ?? 'error'));
    return () => { cancelled = true; };
  }, [mic, permission, devices]);

  const chooseMic = (id: string) => { setMic(id); void setSetting(settingKeys.micDeviceId, id); };
  const chooseSpeaker = (id: string) => { setSpeaker(id); void setSetting(settingKeys.speakerDeviceId, id); };

  const runTest = async () => {
    setTesting(true);
    setRecTest(null);
    stopMeter.current?.();
    stopMeter.current = null;
    const r = await testRecognition();
    setRecTest(r);
    setTesting(false);
    // restart the meter
    meterMicrophone(mic || undefined, setLevel).then((stop) => { stopMeter.current = stop; }).catch(() => {});
  };

  const mics = devices.filter((d) => d.kind === 'audioinput');
  const spks = devices.filter((d) => d.kind === 'audiooutput');
  const hearing = peak > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-sky-100 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="close" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold p-2">✕</button>
        <h3 className="font-display text-2xl font-bold text-slate-800 mb-1">Audio setup</h3>
        <p className="text-xs text-slate-500 font-semibold mb-4">Devices are detected automatically. Speak and watch the meter to find the microphone that hears him.</p>

        <section className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">🎤 Microphone</label>
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${permission === 'granted' ? 'bg-emerald-100 text-emerald-800' : permission === 'denied' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
              {permission === 'granted' ? 'allowed' : permission === 'denied' ? 'blocked' : permission === 'prompt' ? 'not asked yet' : 'unknown'}
            </span>
          </div>
          {mics.length === 0 ? (
            <p className="text-sm text-slate-600">No microphone detected.</p>
          ) : (
            <select value={mic} onChange={(e) => chooseMic(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-800 text-sm font-bold rounded-xl p-2.5">
              {mics.map((d) => <option key={d.id} value={d.id}>{d.label}{d.isDefault ? ' (system default)' : ''}</option>)}
            </select>
          )}
          <div className="mt-3 h-4 rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-full transition-[width] duration-75 ${hearing ? 'bg-emerald-500' : 'bg-sky-400'}`} style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <div className="text-xs font-bold mt-1 text-slate-500">
            {meterError ? PERMISSION_TEXT(meterError) : hearing ? '✓ hearing you' : 'say something…'}
          </div>
          {permResult && !permResult.ok && <p className="text-xs text-rose-700 mt-2">{permResult.message}</p>}
          {permission !== 'granted' && (
            <button onClick={() => void askPermission()} className="mt-2 text-sm font-bold text-sky-700 underline underline-offset-4">allow the microphone</button>
          )}
        </section>

        <section className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">🔊 Speaker</label>
          {spks.length === 0 ? (
            <p className="text-sm text-slate-600">This browser does not list speakers. The system default is used.</p>
          ) : (
            <select value={speaker} onChange={(e) => chooseSpeaker(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-800 text-sm font-bold rounded-xl p-2.5">
              {spks.map((d) => <option key={d.id} value={d.id}>{d.label}{d.isDefault ? ' (system default)' : ''}</option>)}
            </select>
          )}
          <button onClick={() => void tts.speak('Hello! Can you hear me? Let us read some words.')} className="mt-2 bg-sky-100 hover:bg-sky-200 text-sky-900 font-display font-semibold px-4 py-2 rounded-xl text-sm">▶ play a test phrase</button>
        </section>

        <section className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">🗣 Speech recognition test</label>
          <p className="text-xs text-slate-500 mb-2">Tap, then say "hello" within 5 seconds.</p>
          <button disabled={testing} onClick={() => void runTest()} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-display font-semibold px-4 py-2 rounded-xl text-sm">
            {testing ? 'listening…' : 'run the test'}
          </button>
          {recTest && (
            <p className={`text-sm font-semibold mt-2 ${recTest.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{recTest.message}</p>
          )}
        </section>

        <p className="text-[11px] text-slate-500 leading-snug">
          Chrome's speech engine always listens on the <b>system default</b> microphone and speaks through the default speaker, whatever is picked here.
          Use the meter to find the microphone that works, then make it the default in the device's sound settings. The choices are saved for the optional cloud engine, which can use them directly.
        </p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-sky-500 hover:bg-sky-600 text-white font-display font-semibold px-6 py-2.5 rounded-xl text-sm shadow">Done</button>
        </div>
      </div>
    </div>
  );
}

function PERMISSION_TEXT(name: string): string {
  switch (name) {
    case 'NotAllowedError': return 'blocked: allow the microphone for this site';
    case 'NotFoundError': return 'no microphone found';
    case 'NotReadableError': return 'microphone busy or blocked by the system';
    case 'OverconstrainedError': return 'that microphone is gone, pick another';
    default: return `meter error: ${name}`;
  }
}
