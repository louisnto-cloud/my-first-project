/* LearnQuest — world map navigation: home → continent → region path of level nodes.
   Fully visual: icons, colour, and audio — no reading required to navigate. */
'use strict';

const WorldMap = {
  lastRegion: null,

  // Ambient drifting scenery so each region feels like a place, not a menu
  sceneLayer(scene) {
    const layer = U.el('div', 'scene-layer');
    if (U.reduceMotion()) return layer;
    (scene || []).forEach((emo, i) => {
      for (let k = 0; k < 2; k++) {
        const s = U.el('span', 'scene-item', emo);
        s.style.left = U.ri(2, 92) + '%';
        s.style.top = U.ri(4, 88) + '%';
        s.style.fontSize = U.ri(22, 44) + 'px';
        s.style.animationDuration = U.ri(6, 12) + 's';
        s.style.animationDelay = (i * 0.9 + k * 2.1) + 's';
        layer.appendChild(s);
      }
    });
    return layer;
  },

  back() {
    if (WorldMap.lastRegion) WorldMap.showRegion(WorldMap.lastRegion);
    else WorldMap.showHome();
  },

  /* ---- Home: two continents + companion + shop/trophies/parent ---- */

  showHome() {
    WorldMap.lastRegion = null;
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen home-screen');

    // HUD
    const hud = U.el('div', 'home-hud');
    const streak = Store.currentStreak();
    hud.innerHTML = `
      <span class="hud-chip big">⭐ ${Store.state.totalStars}</span>
      <span class="hud-chip big">🪙 ${Store.state.coins}</span>
      <span class="hud-chip big${streak > 0 ? ' fire' : ''}">🔥 ${streak}</span>`;
    const soundBtn = U.el('button', 'icon-btn', Audio2.muted ? '🔇' : '🔊');
    soundBtn.setAttribute('aria-label', 'Toggle sound');
    soundBtn.addEventListener('click', () => {
      Audio2.muted = !Audio2.muted;
      Store.state.settings.muted = Audio2.muted;
      Store.save();
      if (Audio2.muted) Audio2.stop();
      soundBtn.textContent = Audio2.muted ? '🔇' : '🔊';
    });
    hud.appendChild(soundBtn);
    screen.appendChild(hud);

    // Companion greeting
    const buddyRow = U.el('div', 'home-buddy');
    buddyRow.innerHTML = `<button class="buddy-btn" aria-label="Your buddy">${Avatar.svg(110)}</button>
      <div class="buddy-bubble">Where to today?</div>`;
    buddyRow.querySelector('.buddy-btn').addEventListener('click', () => {
      Audio2.say(U.pick([
        'Hi! I\'m ' + Avatar.name() + '! Tap a world to explore!',
        'Ready for an adventure? Pick a world!',
        'You have ' + Store.state.coins + ' coins! Visit the shop to dress me up!'
      ]));
      Audio2.pop();
    });
    screen.appendChild(buddyRow);

    // Daily goal ring
    const goal = Store.state.dailyGoal || 3;
    const doneToday = Store.levelsToday();
    const goalRow = U.el('div', 'goal-row');
    goalRow.innerHTML = `<div class="goal-ring-wrap">${U.goalRingSVG(doneToday, goal)}</div>
      <div class="goal-text">${doneToday >= goal ? "Today's goal complete! 🎉" : `Today's goal · ${doneToday} of ${goal} levels`}</div>`;
    screen.appendChild(goalRow);

    // Continents
    const worlds = U.el('div', 'world-cards');
    CURRICULUM.forEach(world => {
      const done = world.regions.filter(r => Store.state.bossPassed[r.id]).length;
      const card = U.el('button', 'world-card ' + world.id);
      card.innerHTML = `
        <div class="world-emoji">${world.emoji}</div>
        <div class="world-name">${U.esc(world.name)}</div>
        <div class="world-progress">${'●'.repeat(done)}${'○'.repeat(world.regions.length - done)}</div>`;
      card.addEventListener('click', () => { Audio2.whoosh(); WorldMap.showWorld(world.id); });
      worlds.appendChild(card);
    });
    screen.appendChild(worlds);

    // Decorations earned
    if (Store.state.decorOwned.length) {
      const dec = U.el('div', 'home-decor');
      Store.state.decorOwned.forEach(id => {
        const d = Avatar.decor.find(x => x.id === id);
        if (d) dec.appendChild(U.el('span', 'decor-item float', d.icon));
      });
      screen.appendChild(dec);
    }

    // Bottom nav (icons only)
    const nav = U.el('div', 'bottom-nav');
    const mk = (icon, label, fn) => {
      const b = U.el('button', 'nav-btn', icon);
      b.setAttribute('aria-label', label);
      b.addEventListener('click', () => { Audio2.tap(); fn(); });
      return b;
    };
    nav.appendChild(mk('🛍️', 'Shop', () => Shop.show()));
    nav.appendChild(mk('🏆', 'Trophies', () => Trophies.show()));
    const stickerBtn = mk('✨', 'Sticker Book', () => Stickers.show());
    const stCount = Stickers.count();
    if (stCount) stickerBtn.appendChild(U.el('span', 'nav-badge', String(stCount)));
    nav.appendChild(stickerBtn);
    nav.appendChild(mk('🎮', 'Games', () => Shop.show('games')));
    screen.appendChild(nav);

    // Parent corner: small, hold 3 seconds
    const parentBtn = U.el('button', 'parent-btn', '👤');
    parentBtn.setAttribute('aria-label', 'Parent view — press and hold');
    let holdTimer = null, holdRing = null;
    const startHold = (e) => {
      e.preventDefault();
      parentBtn.classList.add('holding');
      holdTimer = setTimeout(() => { parentBtn.classList.remove('holding'); Parent.show(); }, 3000);
    };
    const cancelHold = () => { clearTimeout(holdTimer); parentBtn.classList.remove('holding'); };
    parentBtn.addEventListener('pointerdown', startHold);
    parentBtn.addEventListener('pointerup', cancelHold);
    parentBtn.addEventListener('pointerleave', cancelHold);
    screen.appendChild(parentBtn);

    app.appendChild(screen);

    // Daily goal reached today, not yet celebrated → reward once per day
    if (doneToday >= goal && Store.state.lastGoalDay !== U.todayKey()) {
      Store.state.lastGoalDay = U.todayKey();
      Store.state.coins += 15;
      Store.save();
      setTimeout(() => Celebrate.goalReached(goal), 400);
    }

    // Celebrate any stickers earned since the last time we were home
    const fresh = Stickers.sync();
    if (fresh.length) setTimeout(() => Celebrate.stickerToast(fresh), fresh && doneToday >= goal ? 2200 : 500);
  },

  /* ---- Continent view: 8 regions as islands ---- */

  showWorld(worldId) {
    WorldMap.lastRegion = null;
    const world = CURRICULUM.find(w => w.id === worldId);
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen world-screen ' + worldId);
    screen.appendChild(WorldMap.sceneLayer(world.regions.slice(0, 4).map(r => r.emoji)));
    screen.appendChild(Level.topBar(world.emoji + ' ' + world.name, () => WorldMap.showHome()));

    const trail = U.el('div', 'region-trail');
    world.regions.forEach((region, i) => {
      const unlocked = Store.isRegionUnlocked(world, region);
      const complete = Store.isRegionComplete(region);
      const prog = Store.regionProgress(region);
      const node = U.el('button', 'region-island' + (unlocked ? '' : ' locked') + (complete ? ' complete' : '') + (i % 2 ? ' right' : ' left'));
      node.style.setProperty('--tint', region.tint);
      node.innerHTML = `
        <div class="island-emoji">${unlocked ? region.emoji : '🔒'}</div>
        <div class="island-name">${U.esc(region.name)}</div>
        <div class="island-badge">${complete ? '🏆' : unlocked ? `${prog.done}/${prog.total}` : ''}</div>`;
      if (unlocked) {
        node.addEventListener('click', () => { Audio2.whoosh(); WorldMap.showRegion(region.id); });
      } else {
        node.addEventListener('click', () => {
          Audio2.say(`This land is still hidden! Beat the ${world.regions[i - 1].name} Boss Challenge to open it.`);
          node.classList.add('shake');
          setTimeout(() => node.classList.remove('shake'), 500);
        });
      }
      trail.appendChild(node);
    });
    screen.appendChild(trail);
    app.appendChild(screen);
  },

  /* ---- Region view: level path + fast track + boss ---- */

  showRegion(regionId) {
    const found = findRegion(regionId);
    if (!found) { WorldMap.showHome(); return; }
    const { world, region } = found;
    WorldMap.lastRegion = regionId;

    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen region-screen');
    screen.style.setProperty('--tint', region.tint);
    screen.appendChild(WorldMap.sceneLayer(region.scene));
    screen.appendChild(Level.topBar(region.emoji + ' ' + region.name, () => WorldMap.showWorld(world.id)));

    // Region banner: emoji, grade, progress bar, stars collected here
    const prog = Store.regionProgress(region);
    const regionStars = region.levels.reduce((a, lv) => a + (Store.state.stars[lv.id] || 0), 0);
    const maxStars = region.levels.length * 3;
    const pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    const banner = U.el('div', 'region-banner');
    banner.innerHTML = `
      <div class="rb-emoji">${region.emoji}</div>
      <div class="rb-info">
        <div class="rb-name">${U.esc(region.name)}</div>
        <div class="rb-grade">Grade ${region.grade} · ${world.id === 'math' ? 'Math' : 'Words'}${Store.isRegionComplete(region) ? ' · 🏆 mastered' : ''}</div>
        <div class="rb-bar"><span style="width:${pct}%"></span></div>
        <div class="rb-stats">${prog.done}/${prog.total} levels · ⭐ ${regionStars}/${maxStars}</div>
      </div>`;
    screen.appendChild(banner);

    const path = U.el('div', 'level-path');
    // Lit-path progress fill: the trail glows up to how far you've come
    const litFrac = prog.total ? prog.done / prog.total : 0;
    const fill = U.el('div', 'path-fill');
    fill.style.height = Math.round(litFrac * 100) + '%';
    path.appendChild(fill);

    // Fast Track gate at region entrance (bonus challenge, until region complete)
    if (!Store.isRegionComplete(region)) {
      const ft = U.el('button', 'fast-track-node');
      ft.innerHTML = `<span class="ft-bolt">⚡</span><span class="ft-label">Lightning Trial</span><span class="ft-sub">Bonus challenge!</span>`;
      ft.addEventListener('click', () => {
        Audio2.whoosh();
        Level.playFastTrack(region);
      });
      path.appendChild(ft);
    }

    region.levels.forEach((lv, i) => {
      const unlocked = Store.isLevelUnlocked(world, region, i);
      const stars = Store.state.stars[lv.id] || 0;
      const done = !!Store.state.completed[lv.id];
      const node = U.el('button', 'level-node' + (unlocked ? '' : ' locked') + (done ? ' done' : '') +
        (lv.type === 'review' ? ' review-node' : '') + (i % 2 ? ' zig' : ' zag'));
      node.innerHTML = `
        <span class="node-icon">${unlocked ? lv.icon : '🔒'}</span>
        <span class="node-stars">${done ? '★'.repeat(stars) + '<span class="dim">' + '★'.repeat(3 - stars) + '</span>' : ''}</span>
        <span class="node-name">${U.esc(lv.name)}</span>`;
      if (unlocked) {
        node.addEventListener('click', () => {
          Audio2.pop();
          if (lv.type === 'review') Level.playReview(lv);
          else Level.playSkill(lv);
        });
      } else {
        node.addEventListener('click', () => {
          Audio2.say('Finish the level before this one first!');
          node.classList.add('shake');
          setTimeout(() => node.classList.remove('shake'), 500);
        });
      }
      path.appendChild(node);
    });

    // Boss node at the end
    const bossOpen = Store.bossUnlocked(region);
    const bossDone = Store.isRegionComplete(region);
    const boss = U.el('button', 'boss-node' + (bossOpen ? '' : ' locked') + (bossDone ? ' done' : ''));
    boss.innerHTML = `<span class="boss-crown">${bossDone ? '🏆' : bossOpen ? '👑' : '🔒'}</span>
      <span class="node-name">Boss Challenge</span>`;
    boss.addEventListener('click', () => {
      if (!bossOpen) {
        Audio2.say('The boss waits at the end of the path! Finish every level first.');
        boss.classList.add('shake');
        setTimeout(() => boss.classList.remove('shake'), 500);
        return;
      }
      Audio2.fanfare();
      Level.playBoss(region);
    });
    path.appendChild(boss);

    screen.appendChild(path);
    app.appendChild(screen);
  }
};
