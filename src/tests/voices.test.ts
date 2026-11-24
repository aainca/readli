import { describe, expect, it } from 'vitest';
import { describeVoice, pickVoice, VOICE_PRESETS, type VoiceInfo } from '../speech/voices';

const v = (name: string, lang = 'en-US', localService = true) => describeVoice({ name, lang, voiceURI: name, localService, default: false } as SpeechSynthesisVoice);

describe('describeVoice', () => {
  it('guesses gender from well-known names', () => {
    expect(v('Microsoft Aria Online (Natural) - English (United States)').gender).toBe('female');
    expect(v('Microsoft Guy Online (Natural) - English (United States)').gender).toBe('male');
    expect(v('Google US English').gender).toBe('female');
    expect(v('Samantha').gender).toBe('female');
    expect(v('Daniel', 'en-GB').gender).toBe('male');
    expect(v('Microsoft Zira Desktop').gender).toBe('female');
    expect(v('Fiona').gender).toBe('unknown');
  });
  it('ranks natural voices above robotic ones', () => {
    const natural = v('Microsoft Aria Online (Natural) - English (United States)');
    const google = v('Google US English', 'en-US', false);
    const desktop = v('Microsoft David Desktop');
    const espeak = v('English (America) espeak-ng');
    expect(natural.quality).toBeGreaterThan(google.quality);
    expect(google.quality).toBeGreaterThan(desktop.quality);
    expect(desktop.quality).toBeGreaterThan(espeak.quality);
  });
});

describe('pickVoice', () => {
  const voices: VoiceInfo[] = [
    v('Microsoft Aria Online (Natural) - English (United States)'),
    v('Microsoft Guy Online (Natural) - English (United States)'),
    v('Microsoft David Desktop'),
    v('English (America) espeak-ng'),
  ].sort((a, b) => b.quality - a.quality);
  const preset = (id: string) => VOICE_PRESETS.find((p) => p.id === id)!;

  it('picks the best voice of the preferred gender', () => {
    expect(pickVoice(preset('maple'), voices)?.name).toMatch(/Aria/);
    expect(pickVoice(preset('oak'), voices)?.name).toMatch(/Guy/);
    expect(pickVoice(preset('storyteller'), voices)?.name).toMatch(/Aria/);
  });
  it('Robo picks the least natural voice on purpose', () => {
    expect(pickVoice(preset('robo'), voices)?.name).toMatch(/espeak/);
  });
  it('falls back when the preferred gender is missing', () => {
    const only = [v('Daniel', 'en-GB')];
    expect(pickVoice(preset('maple'), only)?.name).toBe('Daniel');
    expect(pickVoice(preset('maple'), [])).toBeNull();
  });
});
