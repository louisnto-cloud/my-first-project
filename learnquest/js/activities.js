/* LearnQuest — activity engine: renders every question format and reports results.
   Activities.render(container, q, onAnswer) — onAnswer(correct:boolean) fires once per attempt.
   Formats: tap, numpad, sort, sequence, match, blank, trace, typed, numberline */
'use strict';

const Activities = {

  render(container, q, onAnswer) {
    container.innerHTML = '';
    Activities.unbindKeys();
    const fn = Activities['_' + q.format];
    if (!fn) { container.textContent = 'Unknown activity'; return; }
    fn(container, q, onAnswer);
  },

  _keyHandler: null,
  bindKeys(fn) {
    Activities.unbindKeys();
    Activities._keyHandler = fn;
    document.addEventListener('keydown', fn);
  },
  unbindKeys() {
    if (Activities._keyHandler) {
      document.removeEventListener('keydown', Activities._keyHandler);
      Activities._keyHandler = null;
    }
  },

  speakQuestion(q) {
    if (q.say) Audio2.say(q.say, { force: !!q.audioOnly });
  },

  /* --- Tap to select ----------------------------------------------------- */
  _tap(box, q, onAnswer) {
    const grid = U.el('div', 'choice-grid' + (q.big ? ' big' : ''));
    let locked = false;
    q.choices.forEach(c => {
      const b = U.el('button', 'choice-btn');
      if (c.html) b.innerHTML = c.html;
      else b.innerHTML = (c.emoji ? `<span class="choice-emoji">${c.emoji}</span>` : '') +
        (c.label !== '' && c.label !== undefined ? `<span class="choice-label">${U.esc(c.label)}</span>` : '');
      b.addEventListener('click', () => {
        if (locked) return;
        Audio2.tap();
        if (q.speakChoices && !c.correct) Audio2.say(c.label);
        if (c.correct) {
          locked = true;
          b.classList.add('is-correct');
          onAnswer(true);
        } else {
          b.classList.add('is-wrong');
          setTimeout(() => b.classList.remove('is-wrong'), 600);
          onAnswer(false);
        }
      });
      grid.appendChild(b);
    });
    box.appendChild(grid);
  },

  /* --- Number pad --------------------------------------------------------- */
  _numpad(box, q, onAnswer) {
    const wrap = U.el('div', 'numpad-wrap');
    const display = U.el('div', 'numpad-display', '<span class="np-placeholder">?</span>');
    wrap.appendChild(display);
    const pad = U.el('div', 'numpad');
    let val = '';
    const refresh = () => {
      display.innerHTML = val === '' ? '<span class="np-placeholder">?</span>' : U.esc(val);
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    keys.push(q.decimal ? '.' : (q.allowNegative ? '−' : ''));
    keys.push('0', '⌫');
    keys.forEach(k => {
      const b = U.el('button', 'np-key' + (k === '⌫' ? ' np-del' : ''), k);
      if (k === '') { b.className = 'np-key np-empty'; b.disabled = true; }
      b.addEventListener('click', () => {
        Audio2.tap();
        if (k === '⌫') val = val.slice(0, -1);
        else if (k === '−') { val = val.startsWith('-') ? val.slice(1) : '-' + val; }
        else if (k === '.') { if (!val.includes('.')) val += val === '' ? '0.' : '.'; }
        else if (val.replace('-', '').length < 6) val += k;
        refresh();
      });
      pad.appendChild(b);
    });
    wrap.appendChild(pad);
    const go = U.el('button', 'check-btn', 'Check ✓');
    const submit = () => {
      if (val === '' || val === '-') return;
      const num = parseFloat(val);
      const ok = Math.abs(num - q.answer) <= (q.tolerance || 0.001);
      if (!ok) { val = ''; refresh(); }
      onAnswer(ok);
    };
    go.addEventListener('click', submit);
    // Physical keyboard support on laptops
    Activities.bindKeys(e => {
      if (e.key >= '0' && e.key <= '9') { if (val.replace('-', '').length < 6) { val += e.key; refresh(); Audio2.tap(); } }
      else if (e.key === 'Backspace') { val = val.slice(0, -1); refresh(); }
      else if (e.key === '.' && q.decimal) { if (!val.includes('.')) { val += val === '' ? '0.' : '.'; refresh(); } }
      else if (e.key === '-' && q.allowNegative) { val = val.startsWith('-') ? val.slice(1) : '-' + val; refresh(); }
      else if (e.key === 'Enter') submit();
      else return;
      e.preventDefault();
    });
    wrap.appendChild(go);
    box.appendChild(wrap);
  },

  /* --- Typed answer -------------------------------------------------------- */
  _typed(box, q, onAnswer) {
    const wrap = U.el('div', 'typed-wrap');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'typed-input';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Type your answer');
    wrap.appendChild(input);
    const go = U.el('button', 'check-btn', 'Check ✓');
    const submit = () => {
      const v = input.value.trim().toLowerCase();
      if (!v) return;
      const ok = v === String(q.answer).toLowerCase();
      if (!ok) { input.value = ''; }
      onAnswer(ok);
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    wrap.appendChild(go);
    box.appendChild(wrap);
    setTimeout(() => input.focus(), 250);
  },

  /* --- Drag/tap sorting into bins ------------------------------------------ */
  _sort(box, q, onAnswer) {
    const wrap = U.el('div', 'sort-wrap');
    const itemRow = U.el('div', 'sort-items');
    const binRow = U.el('div', 'sort-bins');
    let selected = null;
    let placed = 0, mistakes = 0, done = false;

    const binEls = {};
    q.bins.forEach(bin => {
      const b = U.el('div', 'sort-bin');
      b.innerHTML = `<div class="bin-emoji">${bin.emoji}</div><div class="bin-label">${U.esc(bin.label)}</div><div class="bin-slot"></div>`;
      b.addEventListener('click', () => tryPlace(bin.id, b));
      binEls[bin.id] = b;
      binRow.appendChild(b);
    });

    function tryPlace(binId, binEl) {
      if (!selected || done) return;
      const item = selected;
      if (item.dataset.bin === binId) {
        Audio2.pop();
        item.classList.remove('sel');
        item.classList.add('placed');
        binEl.querySelector('.bin-slot').appendChild(item);
        selected = null;
        placed++;
        if (placed === q.items.length) {
          done = true;
          setTimeout(() => onAnswer(mistakes === 0), 350);
        }
      } else {
        mistakes++;
        Audio2.wrong();
        binEl.classList.add('shake');
        setTimeout(() => binEl.classList.remove('shake'), 500);
      }
    }

    q.items.forEach(it => {
      const t = U.el('button', 'sort-item', U.esc(it.label));
      t.dataset.bin = it.bin;
      t.addEventListener('click', () => {
        if (t.classList.contains('placed') || done) return;
        Audio2.tap();
        if (selected) selected.classList.remove('sel');
        selected = t;
        t.classList.add('sel');
      });
      itemRow.appendChild(t);
    });

    wrap.appendChild(itemRow);
    wrap.appendChild(binRow);
    const hint = U.el('div', 'sort-hint', 'Tap a tile, then tap its box');
    wrap.appendChild(hint);
    box.appendChild(wrap);
  },

  /* --- Sequencing tiles ------------------------------------------------------ */
  _sequence(box, q, onAnswer) {
    const wrap = U.el('div', 'seq-wrap');
    const target = U.el('div', 'seq-target');
    const bankEl = U.el('div', 'seq-bank');
    const tiles = q.sequence.map((s, i) => ({ text: s, order: i }));
    (q.distract || []).forEach(d => tiles.push({ text: d, order: -1 }));
    let chosen = [];
    let done = false;

    const refresh = () => {
      target.innerHTML = '';
      chosen.forEach((tile, idx) => {
        const t = U.el('button', 'seq-tile in-target', U.esc(tile.text));
        t.addEventListener('click', () => {
          if (done) return;
          Audio2.tap();
          chosen.splice(idx, 1);
          tile.el.style.display = '';
          refresh();
        });
        target.appendChild(t);
      });
      for (let i = chosen.length; i < q.sequence.length; i++) target.appendChild(U.el('span', 'seq-slot', ''));
    };

    U.shuffle(tiles).forEach(tile => {
      const t = U.el('button', 'seq-tile', U.esc(tile.text));
      tile.el = t;
      t.addEventListener('click', () => {
        if (done || chosen.length >= q.sequence.length) return;
        Audio2.pop();
        chosen.push(tile);
        t.style.display = 'none';
        refresh();
        if (chosen.length === q.sequence.length) {
          done = true;
          const ok = chosen.every((c, i) => c.text === q.sequence[i]);
          setTimeout(() => {
            if (!ok) {
              done = false;
              chosen.forEach(c => { c.el.style.display = ''; });
              chosen = [];
              refresh();
            }
            onAnswer(ok);
          }, 400);
        }
      });
      bankEl.appendChild(t);
    });

    refresh();
    wrap.appendChild(target);
    wrap.appendChild(bankEl);
    box.appendChild(wrap);
  },

  /* --- Matching pairs ---------------------------------------------------------- */
  _match(box, q, onAnswer) {
    const wrap = U.el('div', 'match-wrap');
    const cards = [];
    q.pairs.forEach((pair, pi) => {
      pair.forEach(face => cards.push({ face, pair: pi }));
    });
    let first = null, matched = 0, mistakes = 0, done = false;
    U.shuffle(cards).forEach(c => {
      const b = U.el('button', 'match-card', U.esc(c.face));
      b.addEventListener('click', () => {
        if (done || b.classList.contains('locked') || b === (first && first.el)) return;
        Audio2.tap();
        b.classList.add('sel');
        if (!first) { first = { ...c, el: b }; return; }
        if (first.pair === c.pair) {
          Audio2.pop();
          b.classList.add('locked'); first.el.classList.add('locked');
          b.classList.remove('sel'); first.el.classList.remove('sel');
          matched++;
          if (matched === q.pairs.length) {
            done = true;
            setTimeout(() => onAnswer(mistakes < 2), 350);
          }
        } else {
          mistakes++;
          Audio2.wrong();
          const fEl = first.el;
          setTimeout(() => { b.classList.remove('sel'); fEl.classList.remove('sel'); }, 450);
        }
        first = null;
      });
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
  },

  /* --- Fill in the blank with word bank ------------------------------------------ */
  _blank(box, q, onAnswer) {
    const wrap = U.el('div', 'blank-wrap');
    const sentence = U.el('div', 'blank-sentence');
    const parts = q.blankText.split('____');
    let filled = null;
    const renderSentence = () => {
      sentence.innerHTML = '';
      sentence.appendChild(document.createTextNode(parts[0]));
      const slot = U.el('span', 'blank-slot' + (filled ? ' filled' : ''), filled ? U.esc(filled) : '');
      slot.addEventListener('click', () => { if (filled) { filled = null; renderSentence(); renderBank(); } });
      sentence.appendChild(slot);
      if (parts[1] !== undefined) sentence.appendChild(document.createTextNode(parts[1]));
    };
    const bank = U.el('div', 'blank-bank');
    const renderBank = () => {
      bank.innerHTML = '';
      q.bank.forEach(w => {
        const b = U.el('button', 'seq-tile' + (filled === w ? ' used' : ''), U.esc(w));
        b.disabled = filled === w;
        b.addEventListener('click', () => {
          Audio2.pop();
          filled = w;
          renderSentence(); renderBank();
        });
        bank.appendChild(b);
      });
    };
    renderSentence(); renderBank();
    const go = U.el('button', 'check-btn', 'Check ✓');
    go.addEventListener('click', () => {
      if (!filled) return;
      const ok = filled.toLowerCase() === String(q.answer).toLowerCase();
      if (!ok) { filled = null; renderSentence(); renderBank(); }
      onAnswer(ok);
    });
    wrap.appendChild(sentence);
    wrap.appendChild(bank);
    wrap.appendChild(go);
    box.appendChild(wrap);
  },

  /* --- Number line: drag the marker to the target value ------------------------------ */
  _numberline(box, q, onAnswer) {
    const min = q.min, max = q.max, step = q.step || 1;
    const span = max - min;
    const wrap = U.el('div', 'nl-wrap');

    const valLabel = U.el('div', 'nl-value', '?');
    wrap.appendChild(valLabel);

    const track = U.el('div', 'nl-track');
    const fill = U.el('div', 'nl-fill');
    track.appendChild(fill);
    // ticks + labels (label every tick for small ranges, else every 5)
    const labelEvery = span <= 12 ? step : 5;
    for (let v = min; v <= max + 1e-9; v += step) {
      const t = U.el('div', 'nl-tick');
      t.style.left = ((v - min) / span * 100) + '%';
      if (Math.round((v - min) / step) % Math.round(labelEvery / step) === 0) {
        t.classList.add('major');
        t.appendChild(U.el('span', 'nl-lab', String(v)));
      }
      track.appendChild(t);
    }
    const marker = U.el('div', 'nl-marker', '<span class="nl-arrow">▲</span>');
    track.appendChild(marker);
    wrap.appendChild(track);

    let val = null, done = false;
    const place = (v) => {
      val = Math.max(min, Math.min(max, Math.round(v / step) * step));
      const pct = (val - min) / span * 100;
      marker.style.left = pct + '%';
      fill.style.width = pct + '%';
      marker.classList.add('placed');
      valLabel.textContent = val;
    };
    const fromX = (clientX) => {
      const r = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      place(min + pct * span);
    };

    let dragging = false;
    const down = e => { if (done) return; dragging = true; fromX((e.touches ? e.touches[0] : e).clientX); e.preventDefault(); };
    const move = e => { if (dragging) { fromX((e.touches ? e.touches[0] : e).clientX); e.preventDefault(); } };
    const up = () => { dragging = false; };
    track.addEventListener('pointerdown', down);
    track.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    track.addEventListener('touchstart', down, { passive: false });
    track.addEventListener('touchmove', move, { passive: false });

    // Keyboard: arrows nudge the marker
    Activities.bindKeys(e => {
      if (done) return;
      if (e.key === 'ArrowRight') { place((val == null ? min : val) + step); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { place((val == null ? min : val) - step); e.preventDefault(); }
      else if (e.key === 'Enter') submit();
    });

    const go = U.el('button', 'check-btn', 'Place it! ✓');
    const submit = () => {
      if (val == null) { Audio2.say('Slide the arrow first!'); return; }
      const ok = Math.abs(val - q.answer) < 1e-9;
      onAnswer(ok);
      if (!ok) { val = null; valLabel.textContent = '?'; marker.classList.remove('placed'); marker.style.left = '0%'; fill.style.width = '0%'; }
      else { done = true; }
    };
    go.addEventListener('click', submit);
    wrap.appendChild(go);
    box.appendChild(wrap);
  },

  /* --- Tracing letters / numbers with finger or mouse ------------------------------- */
  _trace(box, q, onAnswer) {
    const wrap = U.el('div', 'trace-wrap');
    const stage = U.el('div', 'trace-stage');
    const guide = U.el('div', 'trace-guide', U.esc(q.traceChar));
    const canvas = document.createElement('canvas');
    canvas.className = 'trace-canvas';
    stage.appendChild(guide);
    stage.appendChild(canvas);
    wrap.appendChild(stage);

    let drawn = 0, drawing = false, last = null;
    const ctx = canvas.getContext('2d');

    const size = () => {
      const r = stage.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#ff7a59';
    };
    setTimeout(size, 60);

    const pos = e => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const start = e => { drawing = true; last = pos(e); e.preventDefault(); };
    const move = e => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      drawn += Math.hypot(p.x - last.x, p.y - last.y);
      last = p;
      if (drawn > 250) doneBtn.classList.add('ready');
      e.preventDefault();
    };
    const end = () => { drawing = false; };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    const row = U.el('div', 'trace-buttons');
    const clearBtn = U.el('button', 'ghost-btn', '↺ Clear');
    clearBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawn = 0;
      doneBtn.classList.remove('ready');
    });
    const doneBtn = U.el('button', 'check-btn', 'Done ✓');
    doneBtn.addEventListener('click', () => {
      if (drawn < 250) { Audio2.say('Keep tracing the whole shape!'); return; }
      onAnswer(true);
    });
    row.appendChild(clearBtn);
    row.appendChild(doneBtn);
    wrap.appendChild(row);
    box.appendChild(wrap);
  }
};
