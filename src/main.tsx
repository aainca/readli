import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './ui/App';
import { tts } from './speech/tts';
import { getSetting, settingKeys } from './store/settings';
import type { PresetId } from './speech/voices';

void Promise.all([getSetting<PresetId>(settingKeys.voicePreset, 'maple'), getSetting<string | null>(settingKeys.voiceUri, null)])
  .then(([preset, uri]) => tts.setVoice(preset, uri))
  .catch(() => {});

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
