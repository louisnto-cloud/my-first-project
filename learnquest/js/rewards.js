/* LearnQuest — avatar companion, coin shop, trophies, and free-play mini games */
'use strict';

/* ---- Avatar: a round explorer-spirit named by the player ---- */

const Avatar = {
  colors: {
    teal:   { body: '#4ecdc4', dark: '#2fa89f' },
    coral:  { body: '#ff8a70', dark: '#e06349' },
    violet: { body: '#9b8cff', dark: '#7a67e0' },
    gold:   { body: '#ffc247', dark: '#e0a223' },
    mint:   { body: '#7ed9a2', dark: '#54b57d' },
    rose:   { body: '#f28ab5', dark: '#d3618f' },
    sky:    { body: '#6fbdf5', dark: '#4795d1' }
  },

  items: [
    { id: 'base', name: 'Explorer', kind: 'color', value: 'teal', cost: 0, icon: '🟢' },
    { id: 'c-coral', name: 'Coral Glow', kind: 'color', value: 'coral', cost: 30, icon: '🟠' },
    { id: 'c-violet', name: 'Violet Dream', kind: 'color', value: 'violet', cost: 30, icon: '🟣' },
    { id: 'c-gold', name: 'Golden Hour', kind: 'color', value: 'gold', cost: 40, icon: '🟡' },
    { id: 'c-mint', name: 'Mint Breeze', kind: 'color', value: 'mint', cost: 30, icon: '🍃' },
    { id: 'c-rose', name: 'Rose Quartz', kind: 'color', value: 'rose', cost: 40, icon: '🌷' },
    { id: 'c-sky', name: 'Sky Rider', kind: 'color', value: 'sky', cost: 30, icon: '☁️' },
    { id: 'h-crown', name: 'Star Crown', kind: 'hat', value: '👑', cost: 80, icon: '👑' },
    { id: 'h-cap', name: 'Adventure Cap', kind: 'hat', value: '🧢', cost: 40, icon: '🧢' },
    { id: 'h-top', name: 'Fancy Top Hat', kind: 'hat', value: '🎩', cost: 60, icon: '🎩' },
    { id: 'h-flower', name: 'Bloom Clip', kind: 'hat', value: '🌸', cost: 35, icon: '🌸' },
    { id: 'h-wizard', name: 'Wizard Hat', kind: 'hat', value: '🪄', cost: 70, icon: '🪄' },
    { id: 'h-head', name: 'Beat Phones', kind: 'hat', value: '🎧', cost: 55, icon: '🎧' },
    { id: 'g-star', name: 'Star Shades', kind: 'face', value: 'shades', cost: 50, icon: '🕶️' },
    { id: 'g-round', name: 'Scholar Specs', kind: 'face', value: 'specs', cost: 45, icon: '👓' },
    { id: 'g-blush', name: 'Sparkle Cheeks', kind: 'face', value: 'sparkle', cost: 25, icon: '✨' },
    { id: 'p-cape', name: 'Hero Cape', kind: 'back', value: 'cape', cost: 90, icon: '🦸' },
    { id: 'p-wings', name: 'Glide Wings', kind: 'back', value: 'wings', cost: 100, icon: '🪽' }
  ],

  decor: [
    { id: 'd-tent', name: 'Camp Tent', icon: '⛺', cost: 45 },
    { id: 'd-balloon', name: 'Sky Balloon', icon: '🎈', cost: 35 },
    { id: 'd-lighthouse', name: 'Lighthouse', icon: '🗼', cost: 60 },
    { id: 'd-garden', name: 'Wild Garden', icon: '🌻', cost: 40 },
    { id: 'd-fountain', name: 'Fountain', icon: '⛲', cost: 55 },
    { id: 'd-rainbow', name: 'Rainbow Arch', icon: '🌈', cost: 75 }
  ],

  games: [
    { id: 'g-draw', name: 'Doodle Den', icon: '🎨', cost: 60, desc: 'A free-draw art studio' },
    { id: 'g-music', name: 'Melody Maker', icon: '🎹', cost: 60, desc: 'Compose your own tunes' },
    { id: 'g-dress', name: 'Style Studio', icon: '🪞', cost: 40, desc: 'Dress up your buddy' }
  ],

  equipped() {
    const eq = Store.state.avatar.equipped;
    return {
      color: Avatar.colors[eq.color] ? eq.color : 'teal',
      hat: eq.hat || null,
      face: eq.face || null,
      back: eq.back || null
    };
  },

  svg(size) {
    const eq = Avatar.equipped();
    const c = Avatar.colors[eq.color];
    const face = eq.face;
    let backLayer = '';
    if (eq.back === 'cape') backLayer = `<path d="M 25 62 Q 50 100 75 62 L 70 48 Q 50 60 30 48 Z" fill="#f26d9c"/>`;
    if (eq.back === 'wings') backLayer = `<text x="8" y="58" font-size="26">🪽</text><text x="66" y="58" font-size="26" transform="scale(-1,1) translate(-158,0)">🪽</text>`;
    let faceLayer = '';
    if (face === 'shades') faceLayer = `<rect x="26" y="38" width="20" height="11" rx="5" fill="#3d3554"/><rect x="54" y="38" width="20" height="11" rx="5" fill="#3d3554"/><line x1="46" y1="43" x2="54" y2="43" stroke="#3d3554" stroke-width="3"/>`;
    else if (face === 'specs') faceLayer = `<circle cx="36" cy="43" r="9" fill="none" stroke="#3d3554" stroke-width="2.5"/><circle cx="64" cy="43" r="9" fill="none" stroke="#3d3554" stroke-width="2.5"/><line x1="45" y1="43" x2="55" y2="43" stroke="#3d3554" stroke-width="2.5"/>`;
    else if (face === 'sparkle') faceLayer = `<text x="14" y="58" font-size="12">✨</text><text x="74" y="58" font-size="12">✨</text>`;
    const eyes = face === 'shades' ? '' : `<circle cx="36" cy="43" r="4.5" fill="#3d3554"/><circle cx="64" cy="43" r="4.5" fill="#3d3554"/>
      <circle cx="37.5" cy="41.5" r="1.6" fill="#fff"/><circle cx="65.5" cy="41.5" r="1.6" fill="#fff"/>`;
    const hat = eq.hat ? `<text x="50" y="22" text-anchor="middle" font-size="26">${eq.hat}</text>` : '';
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="avatar-svg" aria-hidden="true">
      ${backLayer}
      <ellipse cx="50" cy="90" rx="26" ry="6" fill="rgba(0,0,0,.10)"/>
      <path d="M 50 12 C 76 12 88 34 86 56 C 84 78 70 88 50 88 C 30 88 16 78 14 56 C 12 34 24 12 50 12 Z" fill="${c.body}"/>
      <path d="M 50 12 C 76 12 88 34 86 56 L 86 56 C 78 40 66 32 50 32 C 34 32 22 40 14 56 C 12 34 24 12 50 12 Z" fill="${c.dark}" opacity=".35"/>
      ${eyes}
      <path d="M 40 58 Q 50 66 60 58" fill="none" stroke="#3d3554" stroke-width="3" stroke-linecap="round"/>
      <circle cx="28" cy="52" r="4" fill="rgba(255,255,255,.35)"/>
      <circle cx="72" cy="52" r="4" fill="rgba(255,255,255,.35)"/>
      ${faceLayer}${hat}
    </svg>`;
  },

  name() {
    return Store.state.name || 'Buddy';
  }
};

/* ---- Shop / Studio screen ---- */

const Shop = {
  show(tab) {
    tab = tab || 'style';
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen shop-screen');
    screen.appendChild(Level.topBar('🛍️ Star Shop', () => WorldMap.showHome()));

    const hero = U.el('div', 'shop-hero');
    hero.innerHTML = `${Avatar.svg(130)}<div class="shop-hero-name">${U.esc(Avatar.name())}</div>`;
    screen.appendChild(hero);

    const tabs = U.el('div', 'shop-tabs');
    [['style', '🎨'], ['decor', '🏡'], ['games', '🎮']].forEach(([id, icon]) => {
      const b = U.el('button', 'shop-tab' + (tab === id ? ' active' : ''), icon);
      b.addEventListener('click', () => Shop.show(id));
      tabs.appendChild(b);
    });
    screen.appendChild(tabs);

    const grid = U.el('div', 'shop-grid');
    const st = Store.state;

    const renderItem = (item, owned, equipped, onBuy, onEquip) => {
      const card = U.el('div', 'shop-item' + (equipped ? ' equipped' : ''));
      card.innerHTML = `<div class="shop-icon">${item.icon}</div><div class="shop-name">${U.esc(item.name)}</div>`;
      const btn = U.el('button', 'shop-btn' + (owned ? ' owned' : ''),
        equipped ? '✓ Wearing' : owned ? 'Wear it' : `🪙 ${item.cost}`);
      btn.addEventListener('click', () => {
        if (equipped) return;
        if (owned) { onEquip(); Audio2.pop(); Shop.show(tab); return; }
        if (Store.spend(item.cost)) {
          Audio2.coin();
          Celebrate.confetti(20);
          onBuy();
          Shop.show(tab);
        } else {
          Audio2.say('Not enough coins yet! Play more levels to earn coins.');
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 500);
        }
      });
      card.appendChild(btn);
      return card;
    };

    if (tab === 'style') {
      Avatar.items.forEach(item => {
        const owned = st.avatar.owned.includes(item.id);
        const equipped = st.avatar.equipped[item.kind] === item.value ||
          (item.kind === 'color' && Avatar.equipped().color === item.value);
        grid.appendChild(renderItem(item, owned, equipped,
          () => { st.avatar.owned.push(item.id); st.avatar.equipped[item.kind] = item.value; Store.save(); },
          () => { st.avatar.equipped[item.kind] = (st.avatar.equipped[item.kind] === item.value && item.kind !== 'color') ? null : item.value; Store.save(); }));
      });
    } else if (tab === 'decor') {
      Avatar.decor.forEach(item => {
        const owned = st.decorOwned.includes(item.id);
        grid.appendChild(renderItem(item, owned, owned,
          () => { st.decorOwned.push(item.id); Store.save(); },
          () => {}));
      });
      grid.appendChild(U.el('div', 'shop-note', 'Decorations appear on your home map!'));
    } else {
      Avatar.games.forEach(item => {
        const owned = st.gamesOwned.includes(item.id);
        const card = U.el('div', 'shop-item');
        card.innerHTML = `<div class="shop-icon">${item.icon}</div><div class="shop-name">${U.esc(item.name)}</div><div class="shop-desc">${U.esc(item.desc)}</div>`;
        const btn = U.el('button', 'shop-btn' + (owned ? ' owned' : ''), owned ? '▶ Play!' : `🪙 ${item.cost}`);
        btn.addEventListener('click', () => {
          if (owned) { MiniGames.play(item.id); return; }
          if (Store.spend(item.cost)) {
            Audio2.coin(); Celebrate.confetti(20);
            st.gamesOwned.push(item.id); Store.save();
            Shop.show(tab);
          } else {
            Audio2.say('Not enough coins yet! Play more levels to earn coins.');
          }
        });
        card.appendChild(btn);
        grid.appendChild(card);
      });
    }

    screen.appendChild(grid);
    app.appendChild(screen);
  }
};

/* ---- Trophy shelf ---- */

const Trophies = {
  show() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen trophy-screen');
    screen.appendChild(Level.topBar('🏆 Trophy Shelf', () => WorldMap.showHome()));
    const shelf = U.el('div', 'trophy-shelf');
    let any = false;
    CURRICULUM.forEach(world => world.regions.forEach(region => {
      const won = Store.state.bossPassed[region.id];
      const t = U.el('div', 'trophy' + (won ? ' won' : ''));
      t.innerHTML = `<div class="trophy-cup">${won ? '🏆' : '🔒'}</div>
        <div class="trophy-name">${region.emoji} ${U.esc(region.name)}</div>
        <div class="trophy-grade">${world.id === 'math' ? 'Math' : 'Words'} · Grade ${region.grade}</div>`;
      if (won) any = true;
      shelf.appendChild(t);
    }));
    screen.appendChild(shelf);
    if (!any) screen.appendChild(U.el('div', 'shop-note', 'Beat a Boss Challenge to win your first trophy!'));
    const cur = Store.currentStreak();
    screen.appendChild(U.el('div', 'streak-banner', `🔥 Streak: ${cur} day${cur === 1 ? '' : 's'} · Best: ${Store.state.streak.best}`));
    app.appendChild(screen);
  }
};

/* ---- Mini games: pure play, no learning content ---- */

const MiniGames = {
  play(id) {
    if (id === 'g-draw') MiniGames.drawing();
    else if (id === 'g-music') MiniGames.music();
    else if (id === 'g-dress') Shop.show('style');
  },

  drawing() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen game-screen');
    screen.appendChild(Level.topBar('🎨 Doodle Den', () => Shop.show('games')));
    const stage = U.el('div', 'draw-stage');
    const canvas = document.createElement('canvas');
    canvas.className = 'draw-canvas';
    stage.appendChild(canvas);
    screen.appendChild(stage);

    const palette = ['#3d3554', '#ff7a59', '#ffd34d', '#4ecdc4', '#9b8cff', '#f26d9c', '#5fb0f2', '#57b884', '#ffffff'];
    let color = palette[1], size = 8;
    const tools = U.el('div', 'draw-tools');
    palette.forEach(p => {
      const b = U.el('button', 'draw-swatch');
      b.style.background = p;
      b.addEventListener('click', () => { color = p; Audio2.tap(); });
      tools.appendChild(b);
    });
    [['S', 4], ['M', 10], ['L', 24]].forEach(([l, s]) => {
      const b = U.el('button', 'draw-size', l);
      b.addEventListener('click', () => { size = s; Audio2.tap(); });
      tools.appendChild(b);
    });
    const clear = U.el('button', 'ghost-btn', '↺');
    tools.appendChild(clear);
    screen.appendChild(tools);
    app.appendChild(screen);

    const ctx = canvas.getContext('2d');
    setTimeout(() => {
      const r = stage.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.fillStyle = '#fffaf2';
      ctx.fillRect(0, 0, r.width, r.height);
    }, 60);
    clear.addEventListener('click', () => {
      const r = stage.getBoundingClientRect();
      ctx.fillStyle = '#fffaf2';
      ctx.fillRect(0, 0, r.width, r.height);
    });

    let drawing = false, last = null;
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const start = e => { drawing = true; last = pos(e); e.preventDefault(); };
    const move = e => {
      if (!drawing) return;
      const p = pos(e);
      ctx.strokeStyle = color; ctx.lineWidth = size;
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; e.preventDefault();
    };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', () => drawing = false);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', () => drawing = false);
  },

  music() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen game-screen');
    screen.appendChild(Level.topBar('🎹 Melody Maker', () => Shop.show('games')));

    const colors = ['#ff7a59', '#ffb14a', '#ffd34d', '#57b884', '#4ecdc4', '#5fb0f2', '#9b8cff', '#f26d9c'];
    let recording = [], recordStart = null;

    const pads = U.el('div', 'music-pads');
    colors.forEach((c, i) => {
      const b = U.el('button', 'music-pad');
      b.style.background = c;
      b.addEventListener('pointerdown', () => {
        Audio2.note(i);
        b.classList.add('hit');
        setTimeout(() => b.classList.remove('hit'), 250);
        if (recordStart !== null) recording.push({ i, t: Date.now() - recordStart });
      });
      pads.appendChild(b);
    });
    screen.appendChild(pads);

    const row = U.el('div', 'demo-actions');
    const rec = U.el('button', 'ghost-btn', '⏺ Record');
    const play = U.el('button', 'primary-btn', '▶ Play it back');
    rec.addEventListener('click', () => {
      if (recordStart === null) {
        recording = []; recordStart = Date.now();
        rec.textContent = '⏹ Stop'; rec.classList.add('recording');
      } else {
        recordStart = null;
        rec.textContent = '⏺ Record'; rec.classList.remove('recording');
      }
    });
    play.addEventListener('click', () => {
      recording.forEach(n => setTimeout(() => {
        Audio2.note(n.i);
        const pad = pads.children[n.i];
        pad.classList.add('hit');
        setTimeout(() => pad.classList.remove('hit'), 200);
      }, n.t));
    });
    row.appendChild(rec); row.appendChild(play);
    screen.appendChild(row);
    app.appendChild(screen);
  }
};
