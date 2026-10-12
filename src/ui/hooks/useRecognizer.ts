import { useEffect, useMemo, useRef, useState } from 'react';
import { ManualRecognizer } from '../../speech/ManualRecognizer';
import type { RecognitionResult, Recognizer } from '../../speech/Recognizer';
import { WebSpeechRecognizer } from '../../speech/WebSpeechRecognizer';

export interface RecognizerHandle {
  /** 'web-speech' or 'manual'. */
  mode: string;
  hearsSpeech: boolean;
  listening: boolean;
  interim: string;
  /** Set when the app had to fall back to manual mode. */
  fallbackMessage: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Owns one recognizer for the practice screen. Picks Web Speech when the
 * browser has it, otherwise manual. On a fatal error it switches to manual
 * once and never retries. Final results go to onResult via a ref so the
 * latest handler always wins.
 */
export function useRecognizer(onResult: (r: RecognitionResult) => void): RecognizerHandle {
  const handler = useRef(onResult);
  handler.current = onResult;

  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [forceManual, setForceManual] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');

  const recognizer = useMemo<Recognizer>(() => {
    if (!forceManual && WebSpeechRecognizer.available()) return new WebSpeechRecognizer();
    return new ManualRecognizer();
  }, [forceManual]);

  useEffect(() => {
    const offs = [
      recognizer.onResult((r) => handler.current(r)),
      recognizer.onInterim(setInterim),
      recognizer.onState((on) => {
        setListening(on);
        if (!on) setInterim('');
      }),
      recognizer.onError((e) => {
        if (e.fatal) {
          setFallbackMessage(e.message);
          setForceManual(true);
        }
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      recognizer.dispose();
    };
  }, [recognizer]);

  useEffect(() => {
    if (!WebSpeechRecognizer.available() && !fallbackMessage) {
      setFallbackMessage('This browser has no speech recognition. Judge the words yourself with the buttons below.');
    }
  }, [fallbackMessage]);

  return {
    mode: recognizer.name,
    hearsSpeech: recognizer.hearsSpeech,
    listening,
    interim,
    fallbackMessage,
    start: () => recognizer.start(),
    stop: () => recognizer.stop(),
  };
}
