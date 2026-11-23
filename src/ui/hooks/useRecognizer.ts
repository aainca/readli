import { useEffect, useMemo, useRef, useState } from 'react';
import { ManualRecognizer } from '../../speech/ManualRecognizer';
import type { RecognitionResult, Recognizer } from '../../speech/Recognizer';
import { VoskRecognizer, voskEngine, type EngineStatus } from '../../speech/VoskRecognizer';
import { WebSpeechRecognizer } from '../../speech/WebSpeechRecognizer';
import { getSetting, settingKeys } from '../../store/settings';

export type EngineChoice = 'vosk' | 'webspeech' | 'manual';

export interface RecognizerHandle {
  /** 'vosk', 'web-speech' or 'manual'. */
  mode: string;
  hearsSpeech: boolean;
  listening: boolean;
  interim: string;
  /** Set when the app had to fall back to another engine or manual mode. */
  fallbackMessage: string | null;
  /** Offline engine download state, for a progress line. */
  engine: { status: EngineStatus; progress: number; error?: string };
  start: () => void;
  stop: () => void;
  /** After the parent fixes permissions: try the speech engine again. */
  retry: () => void;
  /** Limit what the engine listens for (engines that support it). */
  setGrammar: (words: string[] | null) => void;
}

/**
 * Owns one recognizer for a screen. Default engine: Vosk, offline in the
 * browser. If the model cannot load it falls back to the browser's Web
 * Speech engine, and from there to parent-judged manual mode. A fatal
 * error switches once and never retries on its own.
 */
export function useRecognizer(onResult: (r: RecognitionResult) => void): RecognizerHandle {
  const handler = useRef(onResult);
  handler.current = onResult;

  const [choice, setChoice] = useState<EngineChoice | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [tier, setTier] = useState<0 | 1 | 2>(0); // 0 = chosen engine, 1 = web speech, 2 = manual
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [engine, setEngine] = useState(voskEngine.status);
  const [micId, setMicId] = useState<string>('');
  const grammar = useRef<string[] | null>(null);

  useEffect(() => {
    void Promise.all([
      getSetting<EngineChoice>(settingKeys.engine, 'vosk'),
      getSetting<string>(settingKeys.micDeviceId, ''),
    ]).then(([c, mic]) => {
      setMicId(mic);
      setChoice(c);
    });
    return voskEngine.onStatus(setEngine);
  }, []);

  const recognizer = useMemo<Recognizer | null>(() => {
    if (choice === null) return null;
    const wantVosk = choice === 'vosk' && tier === 0 && voskEngine.supported();
    if (wantVosk) return new VoskRecognizer({ deviceId: micId });
    const wantWeb = (choice === 'webspeech' && tier === 0) || (choice === 'vosk' && tier <= 1);
    if (wantWeb && WebSpeechRecognizer.available()) return new WebSpeechRecognizer();
    return new ManualRecognizer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, tier, attempt, micId]);

  useEffect(() => {
    if (!recognizer) return;
    recognizer.setGrammar?.(grammar.current);
    const offs = [
      recognizer.onResult((r) => handler.current(r)),
      recognizer.onInterim(setInterim),
      recognizer.onState((on) => {
        setListening(on);
        if (!on) setInterim('');
      }),
      recognizer.onError((e) => {
        if (!e.fatal) return;
        if (recognizer.name === 'vosk' && e.code === 'model' && WebSpeechRecognizer.available()) {
          setFallbackMessage('The offline voice engine could not load, so the browser engine is in use. Check the connection and reopen the app to try again.');
          setTier(1);
          return;
        }
        setFallbackMessage(e.message);
        setTier(2);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      recognizer.dispose();
    };
  }, [recognizer]);

  useEffect(() => {
    if (choice === null || recognizer === null) return;
    if (!recognizer.hearsSpeech && !fallbackMessage && choice !== 'manual') {
      setFallbackMessage('This browser has no speech recognition. Judge the words yourself with the buttons below.');
    }
  }, [choice, recognizer, fallbackMessage]);

  const retry = () => {
    setFallbackMessage(null);
    setTier(0);
    setAttempt((a) => a + 1);
  };

  return {
    mode: recognizer?.name ?? 'loading',
    hearsSpeech: recognizer?.hearsSpeech ?? true,
    listening,
    interim,
    fallbackMessage,
    engine,
    start: () => recognizer?.start(),
    stop: () => recognizer?.stop(),
    retry,
    setGrammar: (words) => {
      grammar.current = words;
      recognizer?.setGrammar?.(words);
    },
  };
}
