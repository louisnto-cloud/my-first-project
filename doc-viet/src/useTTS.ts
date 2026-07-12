import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTTSSettings, saveTTSSettings, type TTSSettings } from './engine';
import { chunkForSpeech } from './prosody';

/**
 * Bilingual text-to-speech tuned for naturalness.
 *
 * - Text is split into language-tagged sentence chunks (see prosody.ts):
 *   English explanations are spoken by the device's best ENGLISH voice as a
 *   native speaker, Vietnamese words by the best VIETNAMESE voice — switching
 *   mid-sentence where the text does.
 * - Each sentence gets its own intonation curve and a short breath after it,
 *   instead of one flat run-on utterance (also dodges Chrome's ~15s kill).
 * - Installed Vietnamese voices are RANKED: Southern-marked voices first
 *   (miền Nam / Sài Gòn / "South" in the name), then neural/natural voices,
 *   then the rest. The top-ranked voice is the default until the user picks.
 * - `wordIndex` tracks the word being spoken across chunk boundaries (-1 when
 *   idle), powering karaoke read-along.
 * - `noViVoice` is true once voices have loaded and none is Vietnamese.
 */

/** Higher = better. Southern wins, then neural quality, then offline capability. */
export function rankVoice(name: string, localService: boolean): number {
  const n = name.toLowerCase();
  let score = 0;
  if (/south|mi[eề]n nam|nam b[oộ]|s[aà]i g[oò]n|saigon|hcm|ho chi minh/.test(n)) score += 100;
  if (/natural|neural|premium|enhanced|online/.test(n)) score += 40;
  if (/google/.test(n)) score += 20;
  if (localService) score += 5; // still works offline — small tie-breaker
  return score;
}

const PREVIEW_TEXT = 'Xin chào! Hôm nay trời đẹp, chúng ta cùng học tiếng Việt nhé.';

export function useTTS() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false); // a speak attempt errored (e.g. no voices installed)
  const [wordIndex, setWordIndex] = useState(-1);
  const [settings, setSettingsState] = useState<TTSSettings>(loadTTSSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);   // Vietnamese voices, best first
  const [enVoices, setEnVoices] = useState<SpeechSynthesisVoice[]>([]); // English voices, best first
  const [noViVoice, setNoViVoice] = useState(false);
  // Each speak() gets a token; stale chunk callbacks from a cancelled run bail out.
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const byQuality = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) =>
        rankVoice(b.name, b.localService) - rankVoice(a.name, a.localService);
      const vi = all.filter((v) => v.lang.toLowerCase().startsWith('vi')).sort(byQuality);
      const en = all.filter((v) => v.lang.toLowerCase().startsWith('en')).sort(byQuality);
      setVoices(vi);
      setEnVoices(en);
      if (all.length > 0) setNoViVoice(vi.length === 0);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const setSettings = useCallback((s: TTSSettings) => {
    setSettingsState(s);
    saveTTSSettings(s);
  }, []);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setWordIndex(-1);
  }, []);

  /** Core: speak language-tagged chunks, giving each the right voice. */
  const speakChunked = useCallback((text: string, opts: { highlight?: boolean; viVoice?: SpeechSynthesisVoice | null }) => {
    if (!window.speechSynthesis) return;
    tokenRef.current += 1;
    const token = tokenRef.current;
    window.speechSynthesis.cancel();

    const chunks = chunkForSpeech(text);
    if (chunks.length === 0) return;
    setSpeaking(true);
    if (opts.highlight) setWordIndex(chunks[0].baseWord);

    const speakFrom = (i: number) => {
      if (token !== tokenRef.current) return; // superseded by a newer speak()/stop()
      const chunk = chunks[i];

      // char offset of each word inside THIS chunk, for boundary → word mapping
      const offsets: number[] = [];
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(chunk.text))) offsets.push(m.index);

      const u = new SpeechSynthesisUtterance(chunk.text);
      u.pitch = 1;
      if (chunk.lang === 'vi') {
        u.lang = 'vi-VN';
        u.rate = settings.rate;
        const viVoice = opts.viVoice ?? null;
        if (viVoice) u.voice = viVoice;
      } else {
        // English is the learner's native language — never slow it to drill
        // speed, and hand it to a native English voice.
        u.lang = 'en-US';
        u.rate = Math.max(settings.rate, 0.95);
        const enVoice = enVoices[0] ?? null;
        if (enVoice) u.voice = enVoice;
      }

      u.onstart = () => {
        if (token !== tokenRef.current) return;
        setFailed(false);
        if (opts.highlight) setWordIndex(chunk.baseWord);
      };
      if (opts.highlight) {
        u.onboundary = (e) => {
          if (token !== tokenRef.current) return;
          if (e.name && e.name !== 'word') return;
          let idx = 0;
          for (let j = 0; j < offsets.length; j++) { if (offsets[j] <= e.charIndex) idx = j; else break; }
          setWordIndex(chunk.baseWord + idx);
        };
      }
      u.onend = () => {
        if (token !== tokenRef.current) return;
        if (i + 1 < chunks.length) {
          // a short breath between sentences — this is what kills the robot feel
          window.setTimeout(() => speakFrom(i + 1), chunk.pauseAfter);
        } else {
          setSpeaking(false);
          setWordIndex(-1);
        }
      };
      u.onerror = (e) => {
        if (token !== tokenRef.current) return;
        // 'interrupted'/'canceled' are normal (we cancel before each speak)
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          setFailed(true);
          setSpeaking(false);
          setWordIndex(-1);
        }
      };
      window.speechSynthesis.speak(u);
    };

    speakFrom(0);
  }, [settings, enVoices]);

  const currentViVoice = useCallback((): SpeechSynthesisVoice | null => {
    return voices.find((v) => v.voiceURI === settings.voiceURI) ?? voices[0] ?? null;
  }, [voices, settings.voiceURI]);

  const speak = useCallback((text: string, opts?: { highlight?: boolean }) => {
    speakChunked(text, { highlight: opts?.highlight, viVoice: currentViVoice() });
  }, [speakChunked, currentViVoice]);

  /** Preview a specific Vietnamese voice (used by the voice picker) without changing settings. */
  const preview = useCallback((voiceURI: string) => {
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? null;
    speakChunked(PREVIEW_TEXT, { viVoice: voice });
  }, [voices, speakChunked]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return { speak, stop, preview, speaking, wordIndex, settings, setSettings, voices, enVoices, supported, failed, noViVoice };
}

export type TTS = ReturnType<typeof useTTS>;
