import { useEffect, useState } from 'react';
import { tts } from '../../speech/tts';
import { listVoices, naturalVoiceTip, onVoicesReady, pickVoice, VOICE_PRESETS, type PresetId, type VoiceInfo } from '../../speech/voices';
import { getSetting, setSetting, settingKeys } from '../../store/settings';

const SAMPLE = 'Hi! Let us read some words. Pancake. Rainbow. You did it!';

/** Five voice personalities with a preview, plus an exact-voice override. */
export function VoicePicker() {
  const [presetId, setPresetId] = useState<PresetId>('maple');
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceInfo[]>(listVoices());
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    void getSetting<PresetId>(settingKeys.voicePreset, 'maple').then(setPresetId);
    void getSetting<string | null>(settingKeys.voiceUri, null).then((u) => { setVoiceUri(u); setAdvanced(!!u); });
    return onVoicesReady(setVoices);
  }, []);

  const choose = (id: PresetId) => {
    setPresetId(id);
    setVoiceUri(null);
    tts.setVoice(id, null);
    void setSetting(settingKeys.voicePreset, id);
    void setSetting(settingKeys.voiceUri, null);
    void tts.speak(SAMPLE);
  };
  const pin = (uri: string) => {
    const v = uri || null;
    setVoiceUri(v);
    tts.setVoice(presetId, v);
    void setSetting(settingKeys.voiceUri, v);
    void tts.speak(SAMPLE);
  };

  const best = voices[0];
  const naturalCount = voices.filter((v) => v.quality >= 4).length;

  return (
    <section className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100 mb-3">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">🗣 Voice</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {VOICE_PRESETS.map((p) => {
          const resolved = pickVoice(p, voices);
          const active = presetId === p.id;
          return (
            <button key={p.id} onClick={() => choose(p.id)} className={`text-left rounded-xl border-2 px-3 py-2 ${active ? 'border-amber-500 bg-white' : 'border-transparent bg-white/60'}`}>
              <div className="font-display text-base font-semibold text-slate-800">{p.emoji} {p.label}</div>
              <div className="text-[11px] text-slate-500">{p.description}</div>
              {resolved && <div className="text-[10px] text-slate-400 truncate mt-0.5">{resolved.name}</div>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <button onClick={() => void tts.speak(SAMPLE)} className="font-bold text-sky-700 underline underline-offset-4">▶ play sample</button>
        <button onClick={() => setAdvanced((a) => !a)} className="text-slate-500 underline underline-offset-4">{advanced ? 'hide exact voices' : 'pick an exact voice'}</button>
      </div>
      {advanced && (
        <div className="mt-2">
          <select value={voiceUri ?? ''} onChange={(e) => pin(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-800 text-sm font-bold rounded-xl p-2.5">
            <option value="">automatic for {VOICE_PRESETS.find((p) => p.id === presetId)?.label}</option>
            {voices.map((v) => (
              <option key={v.uri} value={v.uri}>{v.name} ({v.lang}){v.quality >= 4 ? ' ★ natural' : ''}{!v.local ? ' · online' : ''}</option>
            ))}
          </select>
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-2">
        {voices.length === 0
          ? 'No English voices found yet. '
          : `${voices.length} English voice${voices.length === 1 ? '' : 's'} on this device${naturalCount ? `, ${naturalCount} natural-sounding` : ', none marked natural'}. `}
        {best && best.quality < 4 ? naturalVoiceTip() : 'Voices come from the device, so they differ between the tablet and a laptop.'}
      </p>
    </section>
  );
}
