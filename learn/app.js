// ============================================================
// Learnverse engine — voice, sounds, rewards, activities.
// No kid-facing text: every instruction is spoken out loud.
// ============================================================

/* ---------------- persistent progress ---------------- */
const SAVE_KEY = 'learnverse_v1';
let P = load();
function load() {
  try { return Object.assign({ stars:0, skills:{}, timeMs:0, lastUsed:0, sessions:0 }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch { return { stars:0, skills:{}, timeMs:0, lastUsed:0, sessions:0 }; }
}
function save() { P.lastUsed = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(P)); }
function skill(id) { return P.skills[id] || (P.skills[id] = { a:0, c:0, last:0 }); }
function mark(id, correct) { const s = skill(id); s.a++; if (correct) s.c++; s.last = Date.now(); save(); }
function mastery(id) { const s = P.skills[id]; if (!s || s.a < 3) return 'new'; return (s.c / s.a >= 0.8 && s.c >= 4) ? 'mastered' : 'learning'; }

let sessionStart = Date.now();
setInterval(() => { P.timeMs += 15000; save(); }, 15000);

/* ---------------- speech ---------------- */
let VOICE = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  const prefs = ['Samantha', 'Google US English', 'Karen', 'Moira', 'Daniel'];
  for (const p of prefs) { const v = vs.find(v => v.name.includes(p)); if (v) return v; }
  return vs.find(v => v.lang.startsWith('en')) || vs[0] || null;
}
speechSynthesis.onvoiceschanged = () => { VOICE = pickVoice(); };

function speak(text, opts = {}) {
  return new Promise(res => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (!VOICE) VOICE = pickVoice();
      if (VOICE) u.voice = VOICE;
      u.rate = opts.rate || 0.92;
      u.pitch = opts.pitch || 1.15;
      u.onend = res; u.onerror = res;
      speechSynthesis.speak(u);
      setTimeout(res, Math.max(2500, text.length * 130)); // safety net
    } catch { res(); }
  });
}
let lastPrompt = '';
function say(text, opts) { lastPrompt = text; return speak(text, opts); }

/* ---------------- sound effects (synthesized, no files) ---------------- */
let AC = null;
function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; }
function tone(freq, t0, dur, type = 'sine', vol = 0.18) {
  const c = ac(), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(c.destination);
  const start = c.currentTime + t0;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.start(start); o.stop(start + dur + 0.05);
}
const sfx = {
  pop()    { tone(440, 0, .09, 'triangle', .25); tone(660, .04, .1, 'triangle', .2); },
  tap()    { tone(520, 0, .08, 'sine', .2); },
  yay()    { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .25, 'triangle', .22)); },
  bigwin() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * .1, .35, 'triangle', .22)); [261, 329, 392].forEach(f => tone(f, .6, .8, 'sine', .12)); },
  nudge()  { tone(392, 0, .15, 'sine', .15); tone(440, .12, .2, 'sine', .15); }, // friendly rising boop
  star()   { tone(1318, 0, .12, 'sine', .2); tone(1760, .08, .18, 'sine', .18); },
  swoosh() { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type='sine'; o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(300, c.currentTime); o.frequency.exponentialRampToValueAtTime(900, c.currentTime + .25); g.gain.setValueAtTime(.12, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .3); o.start(); o.stop(c.currentTime + .35); },
};

/* ---------------- particles & rewards ---------------- */
function burst(x, y, chars = ['✨', '⭐', '🌟'], n = 10) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 130;
    el.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    el.style.setProperty('--dy', Math.sin(ang) * dist - 40 + 'px');
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
}
function burstAt(el, chars, n) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, chars, n); }

function giveStar(n = 1) {
  P.stars += n; save(); updateJar();
  sfx.star();
  const jar = document.getElementById('starjar');
  jar.style.animation = 'none'; void jar.offsetWidth; jar.style.animation = 'pulse .4s 2';
  burstAt(jar, ['⭐'], 6);
}
function updateJar() { document.getElementById('starnum').textContent = P.stars; }

const CHEERS = ['Yay! You did it!', 'Amazing!', 'Wow, great job!', 'You are so smart!', 'Fantastic!', 'Super duper!', 'High five!', 'You got it!'];
const NUDGES = ['Almost! Try again!', 'Ooh, so close! One more try!', 'Hmm, not that one — you can do it!', 'Good try! Pick another one!'];
function cheer() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }
function nudgeLine() { return NUDGES[Math.floor(Math.random() * NUDGES.length)]; }

async function celebrate(icon = '🎉', line = null, big = false) {
  const c = document.getElementById('celebrate');
  document.getElementById('bursticon').textContent = icon;
  c.classList.add('active');
  big ? sfx.bigwin() : sfx.yay();
  burst(innerWidth / 2, innerHeight / 2, ['🎉', '⭐', '✨', '🌟', '💫'], big ? 26 : 14);
  await say(line || cheer());
  await new Promise(r => setTimeout(r, big ? 700 : 300));
  c.classList.remove('active');
}

/* ---------------- navigation ---------------- */
const screens = { home: document.getElementById('home'), activity: document.getElementById('activity'), parent: document.getElementById('parent') };
function show(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  document.getElementById('homebtn').style.display = name === 'home' ? 'none' : 'block';
}
function goHome() { speechSynthesis.cancel(); show('home'); buildHome(); sfx.swoosh(); }
document.getElementById('homebtn').addEventListener('click', goHome);
document.getElementById('guide').addEventListener('click', () => { sfx.pop(); if (lastPrompt) speak(lastPrompt); });

/* ---------------- home world ---------------- */
const ISLANDS = [
  { id:'meet',   icon:'🔤', name:'Letter Land',    intro:'Letter Land! Let’s meet the letters!', unlockStars:0 },
  { id:'trace',  icon:'✏️', name:'Tracing Trail',  intro:'Tracing Trail! Draw with your finger!', unlockStars:0 },
  { id:'find',   icon:'🔎', name:'Finding Forest', intro:'Finding Forest! Can you find it?', unlockStars:0 },
  { id:'build',  icon:'🧱', name:'Word Builder',   intro:'Word Builder! Let’s make words!', unlockStars:3 },
  { id:'picture',icon:'🖼️', name:'Picture Pond',   intro:'Picture Pond! Match the picture!', unlockStars:3 },
  { id:'sight',  icon:'⚡', name:'Speedy Words',   intro:'Speedy Words! Super fast words!', unlockStars:6 },
  { id:'story',  icon:'📖', name:'Story Sea',      intro:'Story Sea! Time for a story!', unlockStars:8 },
  { id:'spell',  icon:'🐝', name:'Spelling Bee',   intro:'Spelling Bee! Buzz buzz! Spell it out!', unlockStars:12 },
  { id:'vocab',  icon:'🌋', name:'Word Volcano',   intro:'Word Volcano! Big kid words!', unlockStars:16 },
];
function buildHome() {
  const grid = document.getElementById('worldgrid');
  grid.innerHTML = '';
  for (const isl of ISLANDS) {
    const b = document.createElement('button');
    b.className = 'island';
    const locked = P.stars < isl.unlockStars;
    if (locked) b.classList.add('dimmed');
    b.innerHTML = isl.icon + (locked ? '<span class="badge">⭐</span>' : '');
    b.addEventListener('click', async () => {
      sfx.pop(); burstAt(b, ['✨'], 5);
      if (locked) { await say('Collect more stars to open this one! You can do it!'); return; }
      await say(isl.intro);
      startActivity(isl.id);
    });
    grid.appendChild(b);
  }
  updateJar();
}

/* ---------------- activity engine helpers ---------------- */
const stage = document.getElementById('stage');
function clearStage() { stage.innerHTML = ''; }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickN(arr, n) { return shuffle(arr).slice(0, n); }

// Pick the next letter to work on: earliest letter that isn't mastered,
// plus occasionally revisit an old one. Freedom on top, structure underneath.
function nextLetterIndex(prefix) {
  const L = CONTENT.letters;
  for (let i = 0; i < L.length; i++) {
    if (mastery(prefix + L[i].ch) !== 'mastered') return i;
  }
  return Math.floor(Math.random() * L.length);
}
function knownLetters(prefix) {
  return CONTENT.letters.filter(l => mastery(prefix + l.ch) !== 'new').map(l => l.ch);
}

const ROUNDS = 4; // each activity is ~4 quick rounds then a big finish

function startActivity(id) {
  show('activity');
  clearStage();
  ({ meet: actMeet, trace: actTrace, find: actFind, build: actBuild, picture: actPicture, sight: actSight, story: actStory, spell: actSpell, vocab: actVocab })[id]();
}
async function finishActivity(icon) {
  await celebrate(icon || '🏆', 'You finished! Amazing work! Here is a big star!', true);
  giveStar(2);
  goHome();
}

/* ================= ACTIVITY 1: Meet the Letter ================= */
async function actMeet() {
  const idx = nextLetterIndex('L-');
  const L = CONTENT.letters[idx];
  clearStage();
  const big = el('button', 'bigletter', L.ch);
  const pic = el('div', 'bigemoji', L.emoji);
  stage.append(big, pic);
  let taps = 0;
  big.addEventListener('click', async () => {
    sfx.pop(); burstAt(big, ['✨', '💥'], 8);
    big.style.animation = 'none'; void big.offsetWidth; big.style.animation = 'bounce-big .5s, pulse 2s ease-in-out .5s infinite';
    taps++;
    mark('L-' + L.ch, true);
    if (taps < 3) { await say(`${L.ch.toUpperCase()}! ${L.ch.toUpperCase()} is for ${L.word}!`); }
    else { giveStar(); await finishActivity(L.emoji); }
  });
  pic.addEventListener('click', () => { sfx.tap(); burstAt(pic, ['✨'], 5); speak(L.word + '!'); });
  await say(`Look! This is the letter ${L.ch.toUpperCase()}! ${L.ch.toUpperCase()} is for ${L.word}! Tap the big letter!`);
}

/* ================= ACTIVITY 2: Trace It ================= */
async function actTrace() {
  const idx = nextLetterIndex('T-');
  const L = CONTENT.letters[idx];
  clearStage();
  const size = Math.min(innerWidth * 0.85, innerHeight * 0.6, 480);
  const wrap = el('div', '', '');
  wrap.id = 'tracewrap';
  const cv = document.createElement('canvas');
  cv.id = 'tracecanvas';
  cv.width = size * 2; cv.height = size * 2;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  wrap.appendChild(cv);
  stage.appendChild(wrap);

  const ctx = cv.getContext('2d');
  ctx.scale(2, 2);
  // Draw the letter as a dotted outline target
  ctx.font = `800 ${size * 0.8}px "Comic Sans MS","Chalkboard SE",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.setLineDash([10, 12]); ctx.lineWidth = 4; ctx.strokeStyle = '#b39ddb';
  ctx.strokeText(L.ch, size / 2, size / 2 + size * 0.05);
  ctx.setLineDash([]);
  // sample which pixels belong to the letter (fill on hidden pass)
  const mask = document.createElement('canvas');
  mask.width = size; mask.height = size;
  const mctx = mask.getContext('2d', { willReadFrequently: true });
  mctx.font = `800 ${size * 0.8}px "Comic Sans MS","Chalkboard SE",sans-serif`;
  mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  mctx.fillText(L.ch, size / 2, size / 2 + size * 0.05);
  const maskData = mctx.getImageData(0, 0, size, size).data;
  const targets = [];
  const step = 6;
  for (let y = 0; y < size; y += step) for (let x = 0; x < size; x += step)
    if (maskData[(y * size + x) * 4 + 3] > 100) targets.push({ x, y, hit: false });
  let hitCount = 0, done = false, lastSparkle = 0;

  function paint(x, y) {
    if (done) return;
    ctx.fillStyle = '#7c4dff';
    ctx.beginPath(); ctx.arc(x, y, size * 0.055, 0, Math.PI * 2); ctx.fill();
    const r = size * 0.07;
    for (const t of targets) {
      if (!t.hit && Math.abs(t.x - x) < r && Math.abs(t.y - y) < r) { t.hit = true; hitCount++; }
    }
    const now = Date.now();
    if (now - lastSparkle > 120) { lastSparkle = now; const rct = cv.getBoundingClientRect(); burst(rct.left + x, rct.top + y, ['✨'], 1); if (Math.random() < .4) sfx.tap(); }
    if (!done && hitCount / targets.length > 0.55) {
      done = true;
      mark('T-' + L.ch, true); giveStar();
      setTimeout(() => finishActivity('✏️'), 300);
    }
  }
  function pos(ev) { const r = cv.getBoundingClientRect(); const t = ev.touches ? ev.touches[0] : ev; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  let drawing = false;
  cv.addEventListener('pointerdown', e => { drawing = true; const p = pos(e); paint(p.x, p.y); });
  cv.addEventListener('pointermove', e => { if (drawing) { const p = pos(e); paint(p.x, p.y); } });
  addEventListener('pointerup', () => drawing = false);
  await say(`Trace the letter ${L.ch.toUpperCase()} with your finger! Color it all in!`);
}

/* ================= ACTIVITY 3: Find It ================= */
async function actFind() {
  let round = 0;
  async function next() {
    if (round >= ROUNDS) return finishActivity('🔎');
    round++;
    clearStage();
    const idx = nextLetterIndex('F-');
    const target = CONTENT.letters[idx];
    const others = pickN(CONTENT.letters.filter(l => l.ch !== target.ch), 2);
    const opts = shuffle([target, ...others]);
    const row = el('div', 'choices');
    for (const o of opts) {
      const b = el('button', 'choice', o.ch);
      b.addEventListener('click', async () => {
        if (o.ch === target.ch) {
          mark('F-' + target.ch, true);
          b.classList.add('correct-flash'); burstAt(b, ['⭐', '✨'], 10); sfx.yay();
          giveStar();
          await say(cheer());
          next();
        } else {
          mark('F-' + target.ch, false);
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          sfx.nudge();
          await say(nudgeLine());
          say(`Find the letter ${target.ch.toUpperCase()}!`);
        }
      });
      row.appendChild(b);
    }
    stage.appendChild(row);
    await say(`Can you find the letter ${target.ch.toUpperCase()}?`);
  }
  next();
}

/* ================= ACTIVITY 4: Build a Word ================= */
async function actBuild() {
  let round = 0;
  async function next() {
    if (round >= 3) return finishActivity('🧱');
    round++;
    clearStage();
    const W = CONTENT.buildWords[Math.floor(Math.random() * CONTENT.buildWords.length)];
    const letters = W.w.split('');
    const pic = el('div', 'bigemoji', W.emoji);
    const slots = el('div', 'slots');
    const slotEls = letters.map(() => { const s = el('div', 'slot', ''); slots.appendChild(s); return s; });
    const extras = pickN('abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !letters.includes(c)), 2);
    const tiles = el('div', 'choices');
    let pos = 0;
    for (const ch of shuffle([...letters, ...extras])) {
      const b = el('button', 'choice small', ch);
      b.addEventListener('click', async () => {
        if (ch === letters[pos] && !b.disabled) {
          b.disabled = true; b.style.visibility = 'hidden';
          slotEls[pos].textContent = ch; slotEls[pos].classList.add('filled');
          burstAt(slotEls[pos], ['✨'], 5); sfx.pop();
          pos++;
          if (pos === letters.length) {
            mark('W-' + W.w, true); giveStar();
            await say(letters.join('... ') + '... ' + W.w + '!  ' + W.w + '! You read it!');
            await celebrate(W.emoji, 'You made the word ' + W.w + '! Incredible!');
            next();
          } else {
            speak(ch.toUpperCase());
          }
        } else {
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          sfx.nudge();
          await say(`Try the letter ${letters[pos].toUpperCase()}!`);
        }
      });
      tiles.appendChild(b);
    }
    stage.append(pic, slots, tiles);
    await say(`Let’s build the word ${W.w}! ${letters.map(c => c.toUpperCase()).join('... ')}... ${W.w}! Tap the letter ${letters[0].toUpperCase()} first!`);
  }
  next();
}

/* ================= ACTIVITY 5: Picture Pond ================= */
async function actPicture() {
  let round = 0;
  async function next() {
    if (round >= ROUNDS) return finishActivity('🖼️');
    round++;
    clearStage();
    const opts = pickN(CONTENT.pictureWords, 3);
    const target = opts[Math.floor(Math.random() * opts.length)];
    const row = el('div', 'choices');
    for (const o of shuffle(opts)) {
      const b = el('button', 'choice', o.emoji);
      b.addEventListener('click', async () => {
        if (o.w === target.w) {
          mark('P-' + target.w, true); giveStar();
          b.classList.add('correct-flash'); burstAt(b, ['⭐'], 8); sfx.yay();
          await say(cheer()); next();
        } else {
          mark('P-' + target.w, false);
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sfx.nudge();
          await say(nudgeLine()); say(`Find the ${target.w}!`);
        }
      });
      row.appendChild(b);
    }
    stage.appendChild(row);
    await say(`Tap the ${target.w}!`);
  }
  next();
}

/* ================= ACTIVITY 6: Speedy (sight) Words ================= */
function sightLevel() {
  const lvls = Object.keys(CONTENT.sightWords).map(Number).sort((a, b) => a - b);
  for (const lv of lvls) {
    const words = CONTENT.sightWords[lv];
    const learned = words.filter(w => mastery('S-' + w) === 'mastered').length;
    if (learned < words.length * 0.7) return lv;
  }
  return lvls[lvls.length - 1];
}
async function actSight() {
  let round = 0;
  const lv = sightLevel();
  async function next() {
    if (round >= ROUNDS) return finishActivity('⚡');
    round++;
    clearStage();
    const words = pickN(CONTENT.sightWords[lv], 3);
    const target = words[Math.floor(Math.random() * words.length)];
    const row = el('div', 'choices');
    for (const w of shuffle(words)) {
      const b = el('button', 'choice word', w);
      b.addEventListener('click', async () => {
        if (w === target) {
          mark('S-' + target, true); giveStar();
          b.classList.add('correct-flash'); burstAt(b, ['⚡', '⭐'], 8); sfx.yay();
          await say(cheer()); next();
        } else {
          mark('S-' + target, false);
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sfx.nudge();
          await say(nudgeLine()); say(`Find the word... ${target}!`);
        }
      });
      row.appendChild(b);
    }
    stage.appendChild(row);
    await say(`Quick! Tap the word... ${target}!`);
  }
  next();
}

/* ================= ACTIVITY 7: Story Sea ================= */
function storyLevel() {
  const done = CONTENT.stories.filter(s => mastery('ST-' + s.q) === 'mastered').length;
  return CONTENT.stories[Math.min(done, CONTENT.stories.length - 1)];
}
async function actStory() {
  clearStage();
  const st = storyLevel();
  const row = el('div', 'wordrow');
  const wordEls = st.text.map(w => { const b = el('button', 'wordcard', w); row.appendChild(b); return b; });
  stage.appendChild(row);
  await say('Story time! Tap each word and I will read it. Start with the first word!');
  let i = 0;
  wordEls.forEach((b, idx) => {
    b.addEventListener('click', async () => {
      if (idx !== i) { sfx.tap(); speak(st.text[idx].replace(/[^a-zA-Z'\-]/g, '')); return; }
      b.classList.add('lit'); sfx.pop(); burstAt(b, ['✨'], 3);
      await speak(st.text[idx].replace(/[^a-zA-Z'\-]/g, ''));
      i++;
      if (i === st.text.length) {
        await say('Now listen to the whole story! ' + st.text.join(' '));
        askQuestion();
      }
    });
  });
  async function askQuestion() {
    const qrow = el('div', 'choices');
    for (const o of shuffle(st.options)) {
      const b = el('button', 'choice', o.e);
      b.addEventListener('click', async () => {
        if (o.e === st.answer) {
          mark('ST-' + st.q, true); giveStar();
          burstAt(b, ['⭐', '🎉'], 10); sfx.yay();
          await say(`Yes! ${st.answerWord}! You understood the whole story!`);
          finishActivity('📖');
        } else {
          mark('ST-' + st.q, false);
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sfx.nudge();
          await say(nudgeLine());
          say(st.q);
        }
      });
      qrow.appendChild(b);
    }
    stage.appendChild(qrow);
    await say(st.q + ' Tap the picture!');
  }
}

/* ================= ACTIVITY 8: Spelling Bee ================= */
function spellLevel() {
  const lvls = Object.keys(CONTENT.spelling).map(Number).sort((a, b) => a - b);
  for (const lv of lvls) {
    const words = CONTENT.spelling[lv];
    const learned = words.filter(w => mastery('SP-' + w) === 'mastered').length;
    if (learned < words.length * 0.6) return lv;
  }
  return lvls[lvls.length - 1];
}
async function actSpell() {
  let round = 0;
  const lv = spellLevel();
  async function next() {
    if (round >= 2) return finishActivity('🐝');
    round++;
    clearStage();
    const w = CONTENT.spelling[lv][Math.floor(Math.random() * CONTENT.spelling[lv].length)];
    const letters = w.split('');
    const slots = el('div', 'slots');
    if (letters.length > 6) slots.style.transform = 'scale(.72)';
    const slotEls = letters.map(() => { const s = el('div', 'slot', ''); slots.appendChild(s); return s; });
    const extras = pickN('abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !letters.includes(c)), 3);
    const tiles = el('div', 'choices');
    let pos = 0;
    const uniq = [...new Set([...letters, ...extras])];
    for (const ch of shuffle(uniq)) {
      const b = el('button', 'choice small', ch);
      b.addEventListener('click', async () => {
        if (ch === letters[pos]) {
          slotEls[pos].textContent = ch; slotEls[pos].classList.add('filled');
          burstAt(slotEls[pos], ['✨'], 4); sfx.pop();
          pos++;
          if (letters.indexOf(ch, pos) === -1 && !letters.slice(pos).includes(ch)) { b.disabled = true; b.style.opacity = .3; }
          if (pos === letters.length) {
            mark('SP-' + w, true); giveStar();
            await say(w + '! You spelled it! ' + cheer());
            await celebrate('🐝');
            next();
          }
        } else {
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sfx.nudge();
          await say('Not yet! Listen again... ' + w + '. What letter comes next?');
        }
      });
      tiles.appendChild(b);
    }
    stage.append(slots, tiles);
    await say(`Spelling bee! Spell the word... ${w}. ${w}. Tap the letters in order!`);
  }
  next();
}

/* ================= ACTIVITY 9: Word Volcano (vocabulary) ================= */
function vocabLevel() {
  const lvls = Object.keys(CONTENT.vocab).map(Number).sort((a, b) => a - b);
  for (const lv of lvls) {
    const words = CONTENT.vocab[lv];
    const learned = words.filter(v => mastery('V-' + v.word) === 'mastered').length;
    if (learned < words.length * 0.6) return lv;
  }
  return lvls[lvls.length - 1];
}
async function actVocab() {
  let round = 0;
  const lv = vocabLevel();
  async function next() {
    if (round >= 3) return finishActivity('🌋');
    round++;
    clearStage();
    const v = CONTENT.vocab[lv][Math.floor(Math.random() * CONTENT.vocab[lv].length)];
    const opts = shuffle([v.word, ...v.wrong]);
    const row = el('div', 'choices');
    row.style.flexDirection = 'column';
    for (const w of opts) {
      const b = el('button', 'choice word', w);
      b.addEventListener('click', async () => {
        if (w === v.word) {
          mark('V-' + v.word, true); giveStar();
          b.classList.add('correct-flash'); burstAt(b, ['🌋', '⭐'], 8); sfx.yay();
          await say(`Yes! ${v.word} means ${v.def}! You know big words!`);
          next();
        } else {
          mark('V-' + v.word, false);
          b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sfx.nudge();
          await say(nudgeLine());
          say(`Which word means... ${v.def}?`);
        }
      });
      row.appendChild(b);
    }
    stage.appendChild(row);
    await say(`Listen! Which word means... ${v.def}? Tap it!`);
  }
  next();
}

/* ---------------- parent screen (hidden: hold the gear 3 seconds) ---------------- */
let gearTimer = null;
const gear = document.getElementById('gear');
gear.addEventListener('pointerdown', () => { gearTimer = setTimeout(openParent, 3000); });
gear.addEventListener('pointerup', () => clearTimeout(gearTimer));
gear.addEventListener('pointerleave', () => clearTimeout(gearTimer));

function fmtDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}
function skillRows(prefix, label, nameFn) {
  const rows = Object.entries(P.skills).filter(([k]) => k.startsWith(prefix));
  if (!rows.length) return '';
  const body = rows.sort((a, b) => b[1].last - a[1].last).map(([k, s]) => {
    const m = mastery(k);
    return `<tr><td>${nameFn ? nameFn(k) : k.slice(prefix.length)}</td><td>${s.c}/${s.a} correct</td><td><span class="tag ${m}">${m}</span></td></tr>`;
  }).join('');
  return `<h2>${label}</h2><table><tr><th>Item</th><th>Score</th><th>Status</th></tr>${body}</table>`;
}
function openParent() {
  show('parent');
  const total = Object.values(P.skills).reduce((a, s) => a + s.a, 0);
  document.getElementById('parentpanel').innerHTML = `
    <h1>Parent Dashboard</h1>
    <p>Stars collected: <b>${P.stars}</b> &nbsp;·&nbsp; Total answers: <b>${total}</b><br>
       Total play time: <b>${fmtDur(P.timeMs)}</b><br>
       Last used: <b>${P.lastUsed ? new Date(P.lastUsed).toLocaleString() : 'now'}</b></p>
    <p style="font-size:13px;color:#78909c">“Mastered” means she got it right at least 4 times with 80%+ accuracy. “Learning” means she has tried it but is still practicing. To reopen this screen later: press and hold the little gear in the bottom-right corner for 3 seconds.</p>
    ${skillRows('L-', 'Letters met')}
    ${skillRows('T-', 'Letters traced')}
    ${skillRows('F-', 'Letters found')}
    ${skillRows('W-', 'Words built')}
    ${skillRows('P-', 'Picture words')}
    ${skillRows('S-', 'Sight words')}
    ${skillRows('ST-', 'Stories understood')}
    ${skillRows('SP-', 'Spelling words')}
    ${skillRows('V-', 'Vocabulary')}
    <button class="close" id="closeparent">Back to the app</button>`;
  document.getElementById('closeparent').addEventListener('click', goHome);
}

/* ---------------- offline support ---------------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  try { navigator.serviceWorker.register('sw.js'); } catch {}
}

/* ---------------- boot ---------------- */
document.getElementById('start').addEventListener('click', async function once() {
  this.remove();
  ac(); // unlock audio
  VOICE = pickVoice();
  P.sessions++; save();
  sfx.bigwin();
  buildHome();
  burst(innerWidth / 2, innerHeight / 2, ['🎉', '⭐', '🌈'], 20);
  await say('Hi friend! I’m Foxy! Welcome to your playground! Tap anything you like!');
});
buildHome();
updateJar();
