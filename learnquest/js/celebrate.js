/* LearnQuest — celebration & feedback overlays. Wrong answers teach; wins sparkle. */
'use strict';

const Celebrate = {

  confetti(count) {
    if (U.reduceMotion()) return;
    const layer = U.el('div', 'confetti-layer');
    const colors = ['#ff7a59', '#ffd34d', '#4ecdc4', '#9b8cff', '#f26d9c', '#5fb0f2'];
    for (let i = 0; i < (count || 36); i++) {
      const c = U.el('span', 'confetti');
      c.style.left = U.ri(2, 98) + '%';
      c.style.background = U.pick(colors);
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.animationDuration = (1.4 + Math.random()) + 's';
      c.style.transform = `rotate(${U.ri(0, 360)}deg)`;
      if (Math.random() < 0.3) c.style.borderRadius = '50%';
      layer.appendChild(c);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 2600);
  },

  // Quick "correct!" flash between questions; combo >= 3 turns up the heat
  smallWin(next, combo) {
    Celebrate.confetti(combo >= 3 ? 14 + combo * 4 : 14);
    const buddy = Avatar.svg(88);
    const word = combo >= 3
      ? `Combo ×${combo}!`
      : U.pick(['Yes!', 'Got it!', 'Nice!', 'Brilliant!', 'Boom!', 'Sparkly!']);
    const o = U.el('div', 'flash-overlay');
    o.innerHTML = `<div class="flash-card pop-in${combo >= 3 ? ' combo' : ''}">${buddy}<div class="flash-word">${word}</div></div>`;
    document.body.appendChild(o);
    setTimeout(() => { o.remove(); next(); }, 850);
  },

  // Gentle explanation after a wrong answer — teaching, never shame
  gentleExplain(text, next) {
    const o = U.el('div', 'overlay');
    const card = U.el('div', 'modal-card pop-in explain-card');
    card.innerHTML = `<div class="explain-buddy">${Avatar.svg(92)}</div>
      <div class="explain-title">Here's the trick…</div>
      <div class="explain-text">${U.esc(text || 'Let\'s look at it together and try a fresh one.')}</div>`;
    const btn = U.el('button', 'primary-btn', 'Got it →');
    btn.addEventListener('click', () => { Audio2.stop(); o.remove(); next(); });
    card.appendChild(btn);
    o.appendChild(card);
    document.body.appendChild(o);
    Audio2.say(text || 'No problem! Let\'s try a fresh one.');
  },

  tryAgain(title, text, retry) {
    const o = U.el('div', 'overlay');
    const card = U.el('div', 'modal-card pop-in');
    card.innerHTML = `<div class="explain-buddy">${Avatar.svg(100)}</div>
      <h2>${U.esc(title)}</h2><div class="explain-text">${U.esc(text)}</div>`;
    const btn = U.el('button', 'primary-btn', '💪 Let\'s go!');
    btn.addEventListener('click', () => { o.remove(); retry(); });
    card.appendChild(btn);
    o.appendChild(card);
    document.body.appendChild(o);
    Audio2.say(title + ' ' + text);
  },

  levelWin(level, stars, coins) {
    Audio2.star();
    Celebrate.confetti(50);
    const o = U.el('div', 'overlay');
    const card = U.el('div', 'modal-card pop-in win-card');
    const starHTML = [1, 2, 3].map(i =>
      `<span class="win-star ${i <= stars ? 'lit' : ''}" style="animation-delay:${i * 0.25}s">★</span>`).join('');
    card.innerHTML = `
      <div class="win-stars">${starHTML}</div>
      <h2>${U.esc(level.name)} complete!</h2>
      <div class="explain-buddy big">${Avatar.svg(120)}</div>
      <div class="coin-burst">🪙 +${coins}</div>`;
    const row = U.el('div', 'demo-actions');
    const mapBtn = U.el('button', 'ghost-btn', '🗺️ Map');
    mapBtn.addEventListener('click', () => { o.remove(); WorldMap.showRegion(level.region.id); });
    row.appendChild(mapBtn);
    // Keep the momentum: jump straight into the next node when one is waiting
    const idx = level.region.levels.indexOf(level);
    const next = level.region.levels[idx + 1];
    const nextBtn = U.el('button', 'primary-btn', next ? 'Next level →' : '👑 To the boss!');
    nextBtn.addEventListener('click', () => {
      o.remove();
      if (!next) { WorldMap.showRegion(level.region.id); return; }
      if (next.type === 'review') Level.playReview(next);
      else Level.playSkill(next);
    });
    row.appendChild(nextBtn);
    card.appendChild(row);
    o.appendChild(card);
    document.body.appendChild(o);
    setTimeout(() => Audio2.coin(), 700);
    Audio2.say(stars === 3 ? 'Perfect! Three stars! Incredible work!' :
      stars === 2 ? 'Two stars! Wonderful job!' : 'Level complete! You earned a star!');
  },

  boss(region, acc, coins) {
    Audio2.fanfare();
    Celebrate.confetti(90);
    const o = U.el('div', 'overlay');
    const card = U.el('div', 'modal-card pop-in win-card boss-win');
    card.innerHTML = `
      <div class="trophy-pop">🏆</div>
      <h2>${U.esc(region.name)} conquered!</h2>
      <div class="explain-buddy big">${Avatar.svg(120)}</div>
      <div class="explain-text">A new trophy shines on your shelf.</div>
      <div class="coin-burst">🪙 +${coins || 50}</div>`;
    const btn = U.el('button', 'primary-btn', 'To the map! →');
    btn.addEventListener('click', () => { o.remove(); WorldMap.showWorld(region.worldId); });
    card.appendChild(btn);
    o.appendChild(card);
    document.body.appendChild(o);
    Audio2.say(`You did it! ${region.name} is conquered! A shiny new trophy is yours. The next land is now open!`);
  },

  fastTrack(region, acc) {
    Audio2.fanfare();
    Celebrate.confetti(90);
    const o = U.el('div', 'overlay');
    const card = U.el('div', 'modal-card pop-in win-card boss-win');
    card.innerHTML = `
      <div class="trophy-pop">⚡</div>
      <h2>Lightning Trial won!</h2>
      <div class="explain-buddy big">${Avatar.svg(120)}</div>
      <div class="explain-text">You mastered all of ${U.esc(region.name)} in one epic run. 🪙 +80</div>`;
    const btn = U.el('button', 'primary-btn', 'To the map! →');
    btn.addEventListener('click', () => { o.remove(); WorldMap.showWorld(region.worldId); });
    card.appendChild(btn);
    o.appendChild(card);
    document.body.appendChild(o);
    Audio2.say(`Unbelievable! You aced the lightning trial and conquered all of ${region.name} at once!`);
  }
};
