/* LearnQuest — narration (SpeechSynthesis) and sound effects (WebAudio) */
'use strict';

const Audio2 = {
  ctx: null,
  muted: false,
  voice: null,
  _primed: false,

  pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return;
    // Prefer a friendly natural English voice
    Audio2.voice =
      vs.find(v => /en/i.test(v.lang) && /female|samantha|karen|zira|jenny|aria|natural/i.test(v.name)) ||
      vs.find(v => /^en/i.test(v.lang)) || vs[0];
  },

  init() {
    Audio2.pickVoice();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = Audio2.pickVoice;
      // Some engines populate voices lazily — retry a few times
      let tries = 0;
      const iv = setInterval(() => {
        if (Audio2.voice || ++tries > 10) clearInterval(iv);
        else Audio2.pickVoice();
      }, 300);
    }
    Audio2.armUnlock();
  },

  // Browsers block audio until a user gesture. On the first interaction,
  // resume the AudioContext and prime SpeechSynthesis so the very first
  // sound and narration actually play.
  armUnlock() {
    const evs = ['pointerdown', 'touchstart', 'keydown', 'click'];
    const unlock = () => {
      try { Audio2.ac(); } catch (e) { /* ignore */ }
      if ('speechSynthesis' in window && !Audio2._primed) {
        Audio2._primed = true;
        try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
      }
      if (!Audio2.voice) Audio2.pickVoice();
      evs.forEach(ev => document.removeEventListener(ev, unlock));
    };
    evs.forEach(ev => document.addEventListener(ev, unlock, { passive: true }));
  },

  ac() {
    if (!Audio2.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) Audio2.ctx = new AC();
    }
    if (Audio2.ctx && Audio2.ctx.state === 'suspended') Audio2.ctx.resume();
    return Audio2.ctx;
  },

  say(text, opts) {
    opts = opts || {};
    // opts.force lets audio-only questions speak even when muted — they are
    // unanswerable otherwise. Mute still silences all other narration and SFX.
    if ((Audio2.muted && !opts.force) || !('speechSynthesis' in window) || !text) return;
    if (!Audio2.voice) Audio2.pickVoice();  // last-chance retry if voices loaded late
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (Audio2.voice) u.voice = Audio2.voice;
    const savedRate = (typeof Store !== 'undefined' && Store.state && Store.state.settings.narrationRate) || 0.92;
    u.rate = opts.rate || savedRate;
    u.pitch = opts.pitch || 1.05;
    // Guard against engines that throw on rapid cancel/speak cycles
    try { speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  },

  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },

  tone(freq, dur, type, vol, when) {
    const ctx = Audio2.ac();
    if (!ctx || Audio2.muted) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  pop()   { Audio2.tone(520, 0.09, 'triangle', 0.15); Audio2.tone(780, 0.07, 'sine', 0.1, 0.03); },
  tap()   { Audio2.tone(340, 0.05, 'sine', 0.08); },
  correct() {
    [523, 659, 784].forEach((f, i) => Audio2.tone(f, 0.16, 'triangle', 0.16, i * 0.09));
  },
  // Rising pitch with the combo count — the streak audibly climbs
  combo(n) {
    const lift = Math.pow(1.06, Math.min(n, 8));
    [523, 659, 784, 1046].forEach((f, i) => Audio2.tone(f * lift, 0.14, 'triangle', 0.16, i * 0.07));
  },
  wrong() { Audio2.tone(280, 0.22, 'sine', 0.10); Audio2.tone(220, 0.3, 'sine', 0.08, 0.12); },
  coin()  { Audio2.tone(880, 0.08, 'square', 0.07); Audio2.tone(1320, 0.18, 'square', 0.07, 0.08); },
  star()  { [660, 880, 1100, 1320].forEach((f, i) => Audio2.tone(f, 0.12, 'triangle', 0.12, i * 0.07)); },
  fanfare() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => Audio2.tone(f, 0.22, 'triangle', 0.16, i * 0.13));
    Audio2.tone(261, 1.0, 'sine', 0.07, 0.1);
  },
  whoosh() {
    const ctx = Audio2.ac();
    if (!ctx || Audio2.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.25);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.35);
  },
  note(i) {
    const scale = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
    Audio2.tone(scale[i % scale.length], 0.35, 'triangle', 0.18);
  }
};
