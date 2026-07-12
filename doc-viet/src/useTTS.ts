import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTTSSettings, saveTTSSettings, type TTSSettings } from './engine';

/**
 * Vietnamese text-to-speech with word-boundary highlighting.
 * `wordIndex` tracks the word currently being spoken (-1 when idle),
 * enabling karaoke-style read-along — Vietnamese words are space-separated
 * syllables, so the offset mapping is straightforward.
 * `noViVoice` is true once voices have loaded and none of them is Vietnamese,
 * so the UI can warn that pronunciation will be off.
 */
export function useTTS() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false); // a speak attempt errored (e.g. no voices installed)
  const [wordIndex, setWordIndex] = useState(-1);
  const [settings, setSettingsState] = useState<TTSSettings>(loadTTSSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]); // Vietnamese voices only
  const [noViVoice, setNoViVoice] = useState(false);
  const offsetsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const vi = all.filter((v) => v.lang.toLowerCase().startsWith('vi'));
      setVoices(vi);
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
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setWordIndex(-1);
  }, []);

  const speak = useCallback((text: string, opts?: { highlight?: boolean }) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Precompute the character offset of each word for boundary → word mapping
    const offsets: number[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) offsets.push(m.index);
    offsetsRef.current = offsets;

    const u = new SpeechSynthesisUtterance(text);
    u.rate = settings.rate;
    u.pitch = 1;
    u.lang = 'vi-VN';
    const voice = voices.find((v) => v.voiceURI === settings.voiceURI) ?? voices[0];
    if (voice) u.voice = voice;

    u.onstart = () => { setSpeaking(true); setFailed(false); if (opts?.highlight) setWordIndex(0); };
    u.onend = () => { setSpeaking(false); setWordIndex(-1); };
    u.onerror = (e) => {
      setSpeaking(false);
      setWordIndex(-1);
      // 'interrupted'/'canceled' are normal (we cancel before each speak) — anything else means audio genuinely failed
      if (e.error !== 'interrupted' && e.error !== 'canceled') setFailed(true);
    };
    if (opts?.highlight) {
      u.onboundary = (e) => {
        if (e.name && e.name !== 'word') return;
        const os = offsetsRef.current;
        let idx = 0;
        for (let i = 0; i < os.length; i++) { if (os[i] <= e.charIndex) idx = i; else break; }
        setWordIndex(idx);
      };
    }
    window.speechSynthesis.speak(u);
  }, [settings, voices]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return { speak, stop, speaking, wordIndex, settings, setSettings, voices, supported, failed, noViVoice };
}

export type TTS = ReturnType<typeof useTTS>;
