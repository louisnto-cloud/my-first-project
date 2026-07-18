/*
 * app.js — Bootstrap. Wires up motion handling, unlocks audio on the first
 * gesture, and starts the router. Loaded last.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  // Reflect the effective motion preference onto <body> so CSS can suppress
  // every animation at once (Law 4 + prefers-reduced-motion).
  VLA.applyMotion = function () {
    document.body.classList.toggle('no-motion', VLA.util.motionOff());
  };

  function boot() {
    VLA.applyMotion();

    // React to OS-level reduced-motion changes live.
    try {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var handler = function () { VLA.applyMotion(); };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    } catch (e) { /* ignore */ }

    // Unlock audio on first user interaction (browsers require a gesture).
    var unlock = function () { VLA.audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { once: false });

    VLA.app.start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
