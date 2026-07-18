/*
 * engine.js — The universal activity loop that runs every skill.
 *
 * Two parts:
 *   1. GENERATORS: turn a step's declarative {template, params} into a concrete
 *      question with a model card + choice cards. Values are randomised so the
 *      same item rarely repeats, but the STRUCTURE and PHRASING never change.
 *   2. THE LOOP: renders the model + choices, applies the errorless rules
 *      (Law 1), fills tokens, praises, nods the turtle, and ends every single
 *      question in success — then hands off to the sticker screen after the
 *      token board is full.
 *
 * A "card" is a plain descriptor object. renderCard() turns it into DOM.
 * Descriptor kinds:
 *   picture | numeral | letter | word | shape | outline | group | twoGroups |
 *   sequence | letterCue
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};
  var U = VLA.util, el = U.el;

  /* =========================== GENERATORS =========================== */

  function numeralDistractors(correct, min, max, count) {
    var pool = [];
    for (var v = min; v <= max; v++) if (v !== correct) pool.push(v);
    // If the range is too small, widen outward so we always have enough.
    var extra = 1;
    while (pool.length < count) {
      if (correct - extra >= 1 && pool.indexOf(correct - extra) === -1 && correct - extra !== correct) pool.push(correct - extra);
      if (pool.length < count && correct + extra !== correct && pool.indexOf(correct + extra) === -1) pool.push(correct + extra);
      extra++;
      if (extra > 30) break;
    }
    return U.sample(pool, count);
  }

  // Assemble the final choice list: correct + distractors, trimmed to `n`,
  // shuffled so the correct answer's SLOT varies (the slots never move; only
  // their contents do).
  function assemble(correctCard, distractorCards, n) {
    correctCard.correct = true;
    var chosen = [correctCard].concat(U.sample(distractorCards, n - 1));
    return U.shuffle(chosen);
  }

  var GEN = {
    'match-picture': function (p, n) {
      var pool = p.pool;
      var target = U.pickOne(pool);
      var others = pool.filter(function (x) { return x !== target; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'picture', icon: k }; });
      return { model: { kind: 'picture', icon: target }, choices: assemble({ kind: 'picture', icon: target }, d, n) };
    },

    'match-numeral': function (p, n) {
      var v = U.randInt(p.min, p.max);
      var d = numeralDistractors(v, p.min, p.max, n - 1).map(function (x) { return { kind: 'numeral', value: x }; });
      return { model: { kind: 'numeral', value: v }, choices: assemble({ kind: 'numeral', value: v }, d, n) };
    },

    'count-objects': function (p, n) {
      var count = U.randInt(p.min, p.max);
      var icon = U.pickOne(p.pool);
      var d = numeralDistractors(count, Math.max(1, p.min), p.max, n - 1).map(function (x) { return { kind: 'numeral', value: x }; });
      return {
        model: { kind: 'group', icon: icon, count: count },
        choices: assemble({ kind: 'numeral', value: count }, d, n)
      };
    },

    'compare-quantity': function (p, n) {
      var icon = U.pickOne(p.pool);
      // Guarantee a clear, unambiguous gap (>= 2) between the correct extreme
      // and every other group, so the contrast is always obvious.
      var target, pool = [], v;
      if (p.mode === 'more') {
        target = U.randInt(4, 6);
        for (v = 1; v <= target - 2; v++) pool.push(v);
      } else {
        target = U.randInt(1, 3);
        for (v = target + 2; v <= 6; v++) pool.push(v);
      }
      var counts = [target].concat(U.sample(pool, n - 1));
      var choices = U.shuffle(counts.map(function (c) {
        return { kind: 'group', icon: icon, count: c, compact: true, correct: c === target };
      }));
      return {
        model: { kind: 'cue', icon: p.mode === 'more' ? 'more' : 'fewer' },
        choices: choices,
        instructionKey: 'compare-quantity-' + p.mode
      };
    },

    'match-shape': function (p, n) {
      var pool = p.pool, target = U.pickOne(pool);
      var others = pool.filter(function (x) { return x !== target; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'shape', icon: k }; });
      return { model: { kind: 'shape', icon: target }, choices: assemble({ kind: 'shape', icon: target }, d, n) };
    },

    'shape-to-outline': function (p, n) {
      var pool = p.pool, target = U.pickOne(pool);
      var others = pool.filter(function (x) { return x !== target; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'shape', icon: k }; });
      return { model: { kind: 'outline', icon: target }, choices: assemble({ kind: 'shape', icon: target }, d, n) };
    },

    'one-more': function (p, n) {
      var base = U.randInt(1, p.max - 1);
      var icon = U.pickOne(p.pool);
      var total = base + 1;
      var d = numeralDistractors(total, 1, p.max, n - 1).map(function (x) { return { kind: 'numeral', value: x }; });
      return {
        model: { kind: 'group', icon: icon, count: base, added: 1 },
        choices: assemble({ kind: 'numeral', value: total }, d, n)
      };
    },

    'combine-groups': function (p, n) {
      var a = U.randInt(1, Math.max(1, p.max - 2));
      var b = U.randInt(1, p.max - a);
      var icon = U.pickOne(p.pool);
      var total = a + b;
      var d = numeralDistractors(total, 1, p.max, n - 1).map(function (x) { return { kind: 'numeral', value: x }; });
      return {
        model: { kind: 'twoGroups', icon: icon, a: a, b: b },
        choices: assemble({ kind: 'numeral', value: total }, d, n)
      };
    },

    'next-number': function (p, n) {
      var s = U.randInt(p.min, p.max - 2);
      var answer = s + 2;
      var d = numeralDistractors(answer, p.min, p.max, n - 1).map(function (x) { return { kind: 'numeral', value: x }; });
      return {
        model: { kind: 'sequence', items: [s, s + 1, '?'] },
        choices: assemble({ kind: 'numeral', value: answer }, d, n)
      };
    },

    'missing-number': function (p, n) {
      var s = U.randInt(p.min, p.max - 2);
      var answer = s + 1;
      var d = numeralDistractors(answer, p.min, p.max, n - 1).map(function (x) { return { kind: 'numeral', value: x }; });
      return {
        model: { kind: 'sequence', items: [s, '?', s + 2] },
        choices: assemble({ kind: 'numeral', value: answer }, d, n)
      };
    },

    'match-letter': function (p, n) {
      var v = U.pickOne(p.set);
      var others = p.set.filter(function (x) { return x !== v; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'letter', value: k }; });
      return { model: { kind: 'letter', value: v }, choices: assemble({ kind: 'letter', value: v }, d, n) };
    },

    'find-named-letter': function (p, n) {
      var q = GEN['match-letter'](p, n);
      q.audioText = q.model.value; // speak the letter name (optional support)
      return q;
    },

    'match-case': function (p, n) {
      var upper = U.pickOne(p.set);
      var others = p.set.filter(function (x) { return x !== upper; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'letter', value: k.toLowerCase() }; });
      return {
        model: { kind: 'letter', value: upper },
        choices: assemble({ kind: 'letter', value: upper.toLowerCase() }, d, n)
      };
    },

    'letter-sound': function (p, n) {
      var v = U.pickOne(p.set);
      var others = p.set.filter(function (x) { return x !== v; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'letter', value: k }; });
      return {
        model: { kind: 'letterCue', value: v, icon: p.cues[v] },
        choices: assemble({ kind: 'letter', value: v }, d, n),
        audioText: v
      };
    },

    'match-syllable': function (p, n) {
      var texts = p.pool.map(function (s) { return s.text; });
      var v = U.pickOne(texts);
      var others = texts.filter(function (x) { return x !== v; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'word', value: k }; });
      return { model: { kind: 'word', value: v }, choices: assemble({ kind: 'word', value: v }, d, n), audioText: v };
    },

    'match-word': function (p, n) {
      var texts = p.pool.map(function (s) { return s.text; });
      var v = U.pickOne(texts);
      var others = texts.filter(function (x) { return x !== v; });
      var d = U.sample(others, n - 1).map(function (k) { return { kind: 'word', value: k }; });
      return { model: { kind: 'word', value: v }, choices: assemble({ kind: 'word', value: v }, d, n), audioText: v };
    },

    'word-to-picture': function (p, n) {
      var item = U.pickOne(p.pool);
      var others = p.pool.filter(function (x) { return x.text !== item.text; });
      var d = U.sample(others, n - 1).map(function (o) { return { kind: 'word', value: o.text }; });
      return {
        model: { kind: 'picture', icon: item.icon },
        choices: assemble({ kind: 'word', value: item.text }, d, n),
        audioText: item.text
      };
    }
  };

  function generate(step, choiceCount) {
    var q = GEN[step.template](step.params, choiceCount);
    q.template = step.template;
    q.instruction = VLA.strings.instructions[q.instructionKey || step.template];
    return q;
  }

  /* ============================ RENDERING =========================== */

  // Objects scale to how many there are: few objects are large and clear,
  // many objects shrink to stay in a neat line. `compact` shrinks further for
  // objects shown inside the smaller choice cards (compare-quantity).
  function objSize(total, compact) {
    var s = total <= 2 ? 96 : total <= 3 ? 80 : total <= 4 ? 68 : total <= 5 ? 60
          : total <= 6 ? 52 : total <= 8 ? 46 : 40;
    if (compact) s = Math.round(Math.min(s, 46) * 0.8);
    return s;
  }

  function iconRow(icon, count, addedCount, size) {
    var row = el('div', { class: 'obj-row' });
    var px = (size || objSize(count + (addedCount || 0), false)) + 'px';
    function obj(added) {
      var o = el('div', { class: 'obj' + (added ? ' added' : ''), html: VLA.svg(icon) });
      o.style.width = px; o.style.height = px;
      return o;
    }
    for (var i = 0; i < count; i++) row.appendChild(obj(false));
    for (var j = 0; j < (addedCount || 0); j++) row.appendChild(obj(true));
    return row;
  }

  // Turn a card descriptor into a DOM node (without the outer .card button).
  function renderInner(card) {
    switch (card.kind) {
      case 'picture':
        return el('div', { class: 'svg-box', html: VLA.svg(card.icon) });
      case 'shape':
        return el('div', { class: 'svg-box shape', html: VLA.svg(card.icon) });
      case 'outline':
        return el('div', { class: 'svg-box shape outline', html: VLA.svg(card.icon) });
      case 'cue':
        return el('div', { class: 'svg-box cue', html: VLA.svg(card.icon) });
      case 'numeral':
        return el('div', { class: 'glyph numeral', text: String(card.value) });
      case 'letter':
        return el('div', { class: 'glyph letter', text: String(card.value) });
      case 'word':
        return el('div', { class: 'glyph word', text: String(card.value) });
      case 'group':
        return iconRow(card.icon, card.count, card.added, objSize(card.count + (card.added || 0), card.compact));
      case 'twoGroups':
        return el('div', { class: 'two-groups' }, [
          iconRow(card.icon, card.a, 0, 44),
          el('div', { class: 'plus-sign', text: '+' }),
          iconRow(card.icon, card.b, 0, 44)
        ]);
      case 'sequence':
        return el('div', { class: 'seq-row' }, card.items.map(function (it) {
          return el('div', { class: 'seq-cell' + (it === '?' ? ' blank' : '') , text: it === '?' ? '' : String(it) });
        }));
      case 'letterCue':
        return el('div', { class: 'letter-cue' }, [
          el('div', { class: 'glyph letter', text: card.value }),
          el('div', { class: 'svg-box small', html: VLA.svg(card.icon) })
        ]);
      default:
        return el('div', { class: 'glyph', text: '' });
    }
  }

  /* ========================== ACTIVITY LOOP ========================= */

  var session = null;

  function startSession(pathId, container, callbacks) {
    var path = VLA.data.paths[pathId];
    var idx = VLA.state.currentStepIndex(pathId);
    var step = path.steps[idx];
    var settings = VLA.state.settings();

    session = {
      pathId: pathId, path: path, step: step, stepIndex: idx,
      container: container, callbacks: callbacks,
      target: settings.sessionLength, choiceCount: settings.choices,
      tokens: 0, guidedQuestions: 0
    };
    VLA.state.markUsedToday();
    buildScreen();
    nextQuestion();
  }

  function buildScreen() {
    var C = VLA.components;
    var ft = C.firstThen(session.step);
    session.tokenBoard = C.tokenBoard(session.target);
    session.turtle = C.turtle();

    session.stage = el('div', { class: 'stage' });
    var screen = el('div', { class: 'activity screen' }, [
      C.breakButton(session.callbacks.onBreak),
      ft,
      session.tokenBoard.node,
      session.stage,
      session.turtle.node,
      C.parentGate(session.callbacks.onParent)
    ]);
    U.clear(session.container);
    session.container.appendChild(screen);
    session.tokenBoard.fill(0);
  }

  function nextQuestion() {
    var q = generate(session.step, session.choiceCount);
    session.q = q;
    session.wrong = 0;
    session.wasGuided = false;

    var el2 = U.el;
    var model = el2('div', { class: 'card model' }, renderInner(q.model));
    if (q.model.kind === 'outline') model.classList.add('outline-card');

    var choicesWrap = el2('div', { class: 'choices choices-' + q.choices.length });
    q.choices.forEach(function (card) {
      var btn = el2('button', {
        class: 'card choice', type: 'button',
        on: { click: function () { onChoice(card, btn); } }
      }, renderInner(card));
      card._node = btn;
      choicesWrap.appendChild(btn);
    });

    var instruction = el2('div', { class: 'instruction', text: q.instruction });

    var content = el2('div', { class: 'question' }, [model, instruction, choicesWrap]);

    // Fade the new question in (or swap instantly when motion is off).
    U.transition(session.stage, function (stage) {
      stage.appendChild(content);
    });

    // Speak the fixed instruction, then any optional audio cue (letter/word).
    setTimeout(function () {
      VLA.audio.speak(q.instruction);
      if (q.audioText) setTimeout(function () { VLA.audio.speak(q.audioText); }, 900);
    }, U.motionOff() ? 50 : 350);
  }

  function onChoice(card, btn) {
    if (session.locked) return;
    if (btn.classList.contains('dimmed')) return;

    if (card.correct) {
      handleCorrect(btn);
    } else {
      // LAW 1: quietly fade + shrink. Nothing else. No red, no X, no sound.
      btn.classList.add('dimmed');
      btn.disabled = true;
      session.wrong += 1;
      if (session.wrong >= 2 && !session.wasGuided) {
        session.wasGuided = true;
        session.guidedQuestions += 1;
      }
      if (session.wrong >= 2) {
        // The correct answer begins a slow gentle glow and waits.
        session.q.choices.forEach(function (c) { if (c.correct) c._node.classList.add('glow'); });
      }
    }
  }

  function handleCorrect(btn) {
    session.locked = true;
    btn.classList.remove('glow');
    btn.classList.add('correct');

    // Praise line (text optional), turtle nod (always), token, chime.
    if (VLA.state.settings().praise) {
      var praise = U.el('div', { class: 'praise' }, [
        U.el('span', { class: 'praise-sprout', html: VLA.svg('sprout') }),
        U.el('span', { text: VLA.strings.praise })
      ]);
      btn.parentNode.parentNode.appendChild(praise);
      requestAnimationFrame(function () { praise.classList.add('show'); });
    }
    session.turtle.nod();
    session.tokens += 1;
    session.tokenBoard.fill(session.tokens);
    VLA.audio.chime();

    var delay = U.motionOff() ? 700 : 1500; // ~1.5s calm pause
    setTimeout(function () {
      session.locked = false;
      if (session.tokens >= session.target) finishSession();
      else nextQuestion();
    }, delay);
  }

  function finishSession() {
    var clean = session.guidedQuestions <= 1;
    VLA.state.recordSession(session.pathId, session.step.id, clean);
    session.callbacks.onComplete();
  }

  VLA.engine = { startSession: startSession, _generate: generate, _GEN: GEN };
})();
