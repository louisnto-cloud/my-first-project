/*
 * audio.js — Sound is OFF by default (Law 4). When the parent turns it on,
 * the ONLY sounds that exist are: one soft Vietnamese voice and one quiet
 * chime. Nothing else. No error sounds ever.
 *
 * Speech uses the browser SpeechSynthesis API at lang vi-VN, slow rate 0.85.
 * If the device has no Vietnamese voice, speech falls silent gracefully —
 * the app never depends on audio to be completable.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  var viVoice = null;
  var voicesReady = false;

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var voices = window.speechSynthesis.getVoices() || [];
    viVoice = voices.filter(function (v) { return /^vi(-|_|$)/i.test(v.lang); })[0] || null;
    voicesReady = true;
  }

  if ('speechSynthesis' in window) {
    pickVoice();
    // Voices often load asynchronously.
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  var soundOn = function () { return VLA.state.settings().sound; };

  // ---- Quiet chime via WebAudio (a single soft, short tone) ----
  var actx = null;
  function ensureCtx() {
    if (actx) return actx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (e) { actx = null; }
    return actx;
  }

  VLA.audio = {
    // Unlock audio contexts on the first user gesture (browsers require this).
    unlock: function () {
      if (soundOn()) {
        var c = ensureCtx();
        if (c && c.state === 'suspended') c.resume();
      }
    },

    speak: function (text) {
      if (!soundOn() || !text) return;
      if (!('speechSynthesis' in window)) return;
      if (!voicesReady) pickVoice();
      if (!viVoice) return; // graceful silence: no Vietnamese voice available.
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.voice = viVoice;
        u.lang = 'vi-VN';
        u.rate = 0.85;   // slow, calm
        u.pitch = 1.0;
        u.volume = 0.9;
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },

    chime: function () {
      if (!soundOn()) return;
      var c = ensureCtx();
      if (!c) return;
      try {
        var now = c.currentTime;
        // A soft two-note rising chime, gentle attack + long release.
        [523.25, 659.25].forEach(function (freq, i) {
          var o = c.createOscillator(), g = c.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          var t0 = now + i * 0.12;
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.12, t0 + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
          o.connect(g); g.connect(c.destination);
          o.start(t0); o.stop(t0 + 0.95);
        });
      } catch (e) { /* ignore */ }
    },

    stop: function () {
      if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    },

    hasVoice: function () { return !!viVoice; }
  };
})();
