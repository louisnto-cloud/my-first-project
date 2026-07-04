import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTTSSettings, saveTTSSettings, type TTSSettings } from './engine';

/**
 * Text-to-speech with word-boundary highlighting.
 * `wordIndex` tracks the word currently being spoken (-1 when idle),
 * enabling karaoke-style read-along in the reader views.
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [wordIndex, setWordIndex] = useState(-1);
  const [settings, setSettingsState] = useState<TTSSettings>(loadTTSSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const offsetsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => {
      const en = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      setVoices(en);
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
    u.pitch = 1.05;
    u.lang = 'en-US';
    const voice = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (voice) u.voice = voice;

    u.onstart = () => { setSpeaking(true); if (opts?.highlight) setWordIndex(0); };
    u.onend = () => { setSpeaking(false); setWordIndex(-1); };
    u.onerror = () => { setSpeaking(false); setWordIndex(-1); };
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

  return { speak, stop, speaking, wordIndex, settings, setSettings, voices };
}

export type TTS = ReturnType<typeof useTTS>;
