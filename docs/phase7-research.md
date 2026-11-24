# Phase 7 research: cloud pronunciation scoring

Date checked: 2026-11-24. Every figure below was read from the vendor's live page on that
day (page named in each section). Nothing is implemented yet; this phase needs approval.

## Why consider it at all

The offline Vosk engine answers "did he say this word?" It cannot say *which sound* was
wrong. A pronunciation-assessment service scores each phoneme, so the app could say "the
a sound was short" instead of only "not quite". The cost is that audio leaves the device,
which the spec makes an opt-in parent decision.

## Options

### Azure AI Speech, pronunciation assessment (recommended)

Source pages: `learn.microsoft.com/.../how-to-pronunciation-assessment`,
`learn.microsoft.com/.../rest-speech-to-text-short` (authentication section),
`learn.microsoft.com/.../speech-to-text/data-privacy-security`, and the retail price API
at `prices.azure.com` (East US, USD).

- **Scores.** Accuracy at full-text, word, syllable and phoneme level ("Syllable, word, and
  full text accuracy scores are aggregated from the phoneme-level accuracy score"), plus
  fluency, completeness and, for en-US, an optional prosody score. With `EnableMiscue`
  it tags omitted and inserted words.
- **Modes.** Scripted (you pass the reference text, i.e. the target word) and unscripted.
  Scripted is the reading scenario and is the one this app needs.
- **Browser support.** The JavaScript SDK (`microsoft-cognitiveservices-speech-sdk`,
  npm or a script tag) runs in the browser with the microphone, and the setup page has a
  browser-based section.
- **Keys stay off the client.** The service accepts a short-lived token from the
  `issueToken` endpoint: exchange the resource key for an access token "that's valid for 10
  minutes" and send it as `Authorization: Bearer`. A tiny server function does the
  exchange; the browser never sees the key.
- **Price.** Pronunciation assessment "costs the same as speech to text for Standard"
  pricing. Retail API meters (East US): `S1 Speech To Text` $1.00 per audio hour;
  `Free Speech To Text` $0.00 with the free tier giving 5 audio hours per month
  (pricing page: "Real-time Transcription: 5 audio hours free per month"). An
  `S1 Speech to Text Enhanced Feature Audio` meter at $0.30 per hour exists; the pricing
  page lists prosody as a per-feature real-time add-on, which is most likely this meter.
- **Data.** "For real-time speech to text, audio input is processed only on the Azure's
  server memory, and no data is stored at rest" and "When doing real-time speech to text,
  fast transcription, pronunciation assessment, and speech translation, Microsoft does not
  retain or store the data provided by customers."
- **Children's voices.** Not stated on any page read.

### Speechace API

Source pages: `speechace.com/api-plans/`, `speechace.com/privacy-policy/`.

- Word and sentence pronunciation scores with phoneme and syllable feedback on every plan;
  the Pro plan adds words-correct-per-minute for passage reading.
- Price: Basic $40 per month including 5,000 fifteen-second requests, then $0.008 per
  15 seconds; Pro $80 per month; Premium $125 per month. Free trial on every plan.
  Max audio 30 seconds on Basic.
- Data: "We also collect samples of your audio when you submit it for evaluation."
  Children under 13 need parental approval to use the service.
- Browser use: not stated; the API docs page renders by script and could not be read.
- Verdict: good scores, but a $40 monthly minimum for one child is hard to justify, and
  audio samples are kept.

### ELSA API

Source pages: `elsaspeak.com/en/elsa-api/`, `elsaspeak.com/en/enterprise/pricing`.

- Scripted and unscripted modes; sentence, word and phoneme scores with mispronunciation
  hints.
- Price per 15 seconds of audio: scripted $0.008 (Standard) or $0.01 (Premium);
  unscripted $0.02 / $0.025. Standard scripted audio up to 20 seconds per request.
- The enterprise pricing page is contact-sales with a 12-month minimum; whether the API
  can be bought self-serve was not stated.
- Children's voices, data retention, browser use: not stated.

### SoapBox Labs

Source page: `curriculumassociates.com/about/ailabs` (soapboxlabs.com redirects there).

- The one engine built for children's voices ("designed to support children's unique
  voices, speech patterns, and busy classroom environments", privacy-certified by Digital
  Promise). It is now Curriculum Associates' internal technology. No developer sign-up,
  API documentation or pricing is offered on the page. Not available to us.

### Google Cloud Speech-to-Text and Amazon Transcribe

Amazon Transcribe's overview page describes transcription only, no pronunciation scoring.
Google's pricing page renders by script and its docs host could not be reached; as far
as its product pages go it is transcription only. Neither fits the need.

## Recommendation

Azure, scripted mode, en-US, phoneme granularity, behind an opt-in switch.

- Fits the task exactly (reference text = the word on screen).
- Cheapest by far for one family: at $1 per audio hour, a 10-minute session with roughly
  3 minutes of actual speech costs about $0.05, and the free tier's 5 hours a month
  covers about 100 such sessions at no cost.
- Clear written statement that real-time audio is not stored.
- Browser SDK plus 10-minute tokens means a minimal proxy and no key in the app.

Risks to state plainly: Azure says nothing about accuracy on children's voices, so
phoneme scores on a 3rd grader may be noisy; the parent override must stay the final
word. Prosody is an extra meter and not needed for single words.

## Proposed implementation (not started)

1. **Proxy.** One Netlify Function, `speech-token`, holding the Azure key and region in
   Netlify environment variables. It calls `issueToken`, returns `{ token, region }`,
   and refuses more than a few calls per minute per IP. No audio passes through it.
2. **Engine.** `AzureRecognizer` implementing the existing `Recognizer` interface, using
   the JavaScript SDK with `PronunciationAssessmentConfig(referenceText = word, HundredMark,
   Phoneme, miscue off)`. It emits the same word result as the other engines plus a
   `score` event: per-phoneme accuracy for the word.
3. **UI.** A fourth engine choice in Audio setup, "Cloud pronunciation scoring (Azure)",
   with a plain-language consent note: audio is sent to Microsoft for scoring and not
   stored; off by default. On the word card, a wrong read shows which sound scored low,
   mapped to the rule panel's letters ("the a sound, short vowel").
4. **Fallback.** Any token or network failure drops back to the offline engine for the
   rest of the session with a one-line notice.
5. **Tests.** Pure mapping from Azure phoneme results to letter highlights, unit tested;
   the SDK itself behind the interface.

Estimated size: about one phase of work. Needs an Azure account with a Speech resource
(free F0 tier is enough to start) and two Netlify environment variables.
