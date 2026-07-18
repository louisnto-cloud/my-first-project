/* LearnQuest — boot */
'use strict';

window.addEventListener('DOMContentLoaded', () => {
  Store.load();
  Audio2.init();

  // Offline support when served over HTTP(S); file:// already works offline
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Don't keep narrating into a hidden tab / sleeping iPad
  document.addEventListener('visibilitychange', () => { if (document.hidden) Audio2.stop(); });

  // Honour reduced-motion preference (OS setting or parent toggle)
  const applyMotion = () => document.body.classList.toggle('reduce-motion', U.reduceMotion());
  applyMotion();
  window.applyMotionPref = applyMotion;

  if (!Store.state.name) {
    // First run: pick a buddy name — spoken, tap to choose
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen welcome-screen');
    screen.innerHTML = `
      <div class="welcome-logo">🗺️</div>
      <h1 class="welcome-title">LearnQuest</h1>
      <div class="welcome-buddy">${Avatar.svg(140)}</div>
      <div class="welcome-sub">Choose your buddy's name!</div>`;
    const grid = U.el('div', 'name-grid');
    U.pickN(EN.avatarNames, 4).forEach(n => {
      const b = U.el('button', 'name-btn', n);
      b.addEventListener('click', () => {
        Store.state.name = n;
        Store.save();
        Audio2.pop();
        Audio2.say(`${n}! I love it! Hi, I'm ${n}, your adventure buddy. Let's explore! Tap a world to start.`);
        Celebrate.confetti(30);
        WorldMap.showHome();
      });
      // Speak the name on first hover/long-press via a small speaker
      const sp = U.el('span', 'name-speak', '🔊');
      sp.addEventListener('click', (e) => { e.stopPropagation(); Audio2.say(n); });
      b.appendChild(sp);
      grid.appendChild(b);
    });
    screen.appendChild(grid);
    app.appendChild(screen);
    // Speak after the first user gesture (browser autoplay rules)
    const speakIntro = () => {
      Audio2.say('Welcome to Learn Quest! First, choose a name for your buddy. Tap the little speaker to hear each name.');
      document.removeEventListener('pointerdown', speakIntro);
    };
    document.addEventListener('pointerdown', speakIntro, { once: true });
  } else {
    WorldMap.showHome();
  }
});
