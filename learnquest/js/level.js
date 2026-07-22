/* LearnQuest — level flow: Show me → Try it → Prove it.
   Also runs Review Mix, Boss Challenges, and Fast Track samplers. */
'use strict';

const Level = {
  current: null,

  /* Entry points ------------------------------------------------------- */

  playSkill(level) {
    Level.current = { kind: 'skill', level };
    Level.showDemo(level);
  },

  playReview(level) {
    Level.current = { kind: 'review', level };
    const qs = Quest.forReview(level, 6);
    Level.runQuiz({
      title: 'Review Mix',
      icon: '🔄',
      intro: 'Review time! A little bit of everything you have learned. Show me what you remember!',
      questions: qs,
      passRatio: 0.8,
      practice: false,
      onDone: (acc, passed) => Level.finishLevel(level, acc, passed)
    });
  },

  playBoss(region) {
    Level.current = { kind: 'boss', region };
    const qs = Quest.forRegion(region, 15);
    Level.runQuiz({
      title: 'Boss Challenge',
      icon: '👑',
      intro: `This is it — the ${region.name} Boss Challenge! Fifteen questions from everything in this land. You have got this!`,
      questions: qs,
      passRatio: 0.85,
      practice: false,
      boss: true,
      onDone: (acc, passed) => {
        if (passed) {
          const coins = Store.passBoss(region.id);
          Celebrate.boss(region, acc, coins);
        } else {
          Celebrate.tryAgain(
            'So close to the crown!',
            'The boss is tough — that is what makes it epic. Play a level or two, then come back stronger!',
            () => WorldMap.showRegion(region.id)
          );
        }
      }
    });
  },

  playFastTrack(region) {
    Level.current = { kind: 'fast', region };
    const qs = Quest.forRegion(region, 10);
    Level.runQuiz({
      title: 'Lightning Trial',
      icon: '⚡',
      intro: `A bonus challenge! Ten questions from all of ${region.name}. Ace nine of them and you conquer the whole land at once!`,
      questions: qs,
      passRatio: 0.9,
      practice: false,
      boss: true,
      onDone: (acc, passed) => {
        if (passed) {
          Store.fastTrack(region.id, region);
          Celebrate.fastTrack(region, acc);
        } else {
          Celebrate.tryAgain(
            'What a brave try!',
            'That lightning trial was fierce. No worries — the path through ' + region.name + ' is full of fun. Every level makes you stronger!',
            () => WorldMap.showRegion(region.id)
          );
        }
      }
    });
  },

  /* Phase 1 — Show me ----------------------------------------------------- */

  showDemo(level) {
    const app = document.getElementById('app');
    const sample = Quest.make(level.gen, level.params);
    app.innerHTML = '';
    const screen = U.el('div', 'screen level-screen demo-screen');
    screen.appendChild(Level.topBar(level.icon + ' ' + level.name, () => WorldMap.showRegion(level.region.id)));

    const card = U.el('div', 'demo-card');
    card.innerHTML = `
      <div class="phase-chip">👀 Show me</div>
      <div class="demo-stage">
        ${sample.visual || `<div class="demo-big">${level.icon}</div>`}
        <div class="demo-prompt">${sample.passage ? passageHTML(sample.passage) : ''}${U.esc(sample.prompt)}</div>
        <div class="demo-answer" id="demo-answer"></div>
      </div>`;
    screen.appendChild(card);

    const row = U.el('div', 'demo-actions');
    const replay = U.el('button', 'ghost-btn', '🔊 Hear it again');
    const go = U.el('button', 'primary-btn', 'My turn! →');
    row.appendChild(replay);
    row.appendChild(go);
    screen.appendChild(row);
    app.appendChild(screen);

    // Reveal the answer visually after a beat — a worked example, not a lecture.
    // Sort/match/trace demos have no single "answer" to reveal; the explanation carries them.
    const answerText = sample.format === 'numpad' || sample.format === 'typed' || sample.format === 'numberline' ? String(sample.answer)
      : sample.format === 'tap' ? (sample.choices.find(c => c.correct).label || null)
      : sample.format === 'sequence' ? sample.sequence.join(' ')
      : sample.format === 'blank' ? sample.answer
      : null;
    setTimeout(() => {
      const da = document.getElementById('demo-answer');
      if (da && answerText) { da.innerHTML = `<span class="demo-reveal">${U.esc(answerText)}</span>`; }
    }, 1600);

    const narration = `${level.name}! Watch first. ${sample.say || sample.prompt} ... ` +
      (answerText ? `The answer is ${answerText}. ` : '') +
      `${sample.explain || ''} Now you try!`;
    const speak = () => Audio2.say(narration);
    speak();
    replay.addEventListener('click', speak);
    go.addEventListener('click', () => {
      Audio2.stop();
      Level.practice(level);
    });
  },

  /* Phase 2 — Try it (guided, unlimited attempts) ---------------------------- */

  practice(level) {
    const questions = Quest.forLevel(level, 3);
    let idx = 0;

    const next = () => {
      if (idx >= questions.length) { Level.prove(level); return; }
      Level.renderQuestion({
        q: questions[idx],
        title: level.icon + ' ' + level.name,
        phase: { label: '🧪 Try it', cls: 'phase-try' },
        progress: { done: idx, total: questions.length },
        hints: true,
        backTo: () => WorldMap.showRegion(level.region.id),
        onCorrect: () => {
          idx++;
          Celebrate.smallWin(() => next());
        },
        onWrong: (q, replayQuestion) => {
          // Gentle teaching: explain, then let her try the same idea again
          Celebrate.gentleExplain(q.explain, () => {
            questions[idx] = Quest.make(level.gen, level.params);
            replayQuestion(questions[idx]);
          });
        }
      });
    };
    next();
  },

  /* Phase 3 — Prove it (unaided, 80%) --------------------------------------- */

  prove(level) {
    const qs = Quest.forLevel(level, 6);
    Level.runQuiz({
      title: level.icon + ' ' + level.name,
      icon: '🛡️',
      intro: 'Prove it time! No hints now — you know this. Six questions. Go!',
      questions: qs,
      passRatio: 0.8,
      onDone: (acc, passed) => Level.finishLevel(level, acc, passed)
    });
  },

  finishLevel(level, acc, passed) {
    if (passed) {
      const stars = acc >= 0.99 ? 3 : acc >= 0.85 ? 2 : 1;
      const res = Store.completeLevel(level.id, stars);
      Celebrate.levelWin(level, stars, res.coinsEarned);
    } else {
      Celebrate.tryAgain(
        'Almost there!',
        'Let\'s warm up with a little more practice — then you will crush it.',
        () => {
          if (level.type === 'review') Level.playReview(level);
          else Level.practice(level);
        }
      );
    }
  },

  /* Quiz runner (prove / review / boss / fast-track) -------------------------- */

  runQuiz(cfg) {
    let idx = 0, correct = 0, combo = 0;
    const total = cfg.questions.length;

    const intro = () => {
      const app = document.getElementById('app');
      app.innerHTML = '';
      const screen = U.el('div', 'screen quiz-intro' + (cfg.boss ? ' boss-intro' : ''));
      screen.appendChild(Level.topBar(cfg.title, () => { Audio2.stop(); WorldMap.back(); }));
      const card = U.el('div', 'intro-card');
      card.innerHTML = `<div class="intro-icon">${cfg.icon}</div>
        <h2>${U.esc(cfg.title)}</h2>
        <div class="intro-sub">${total} questions</div>`;
      const go = U.el('button', 'primary-btn big-go', cfg.boss ? '⚔️ Begin!' : 'Ready! →');
      const replay = U.el('button', 'ghost-btn', '🔊');
      const row = U.el('div', 'demo-actions');
      row.appendChild(replay); row.appendChild(go);
      card.appendChild(row);
      screen.appendChild(card);
      app.appendChild(screen);
      Audio2.say(cfg.intro);
      replay.addEventListener('click', () => Audio2.say(cfg.intro));
      go.addEventListener('click', () => { Audio2.stop(); if (cfg.boss) Audio2.fanfare(); ask(); });
    };

    const ask = () => {
      if (idx >= total) {
        const acc = correct / total;
        cfg.onDone(acc, acc >= cfg.passRatio - 0.0001);
        return;
      }
      Level.renderQuestion({
        q: cfg.questions[idx],
        title: cfg.title,
        phase: { label: cfg.boss ? '👑 ' + (idx + 1) + ' / ' + total : '🛡️ Prove it', cls: 'phase-prove' },
        progress: { done: idx, total },
        score: { correct, total: idx },
        hints: false,
        backTo: () => WorldMap.back(),
        onCorrect: () => {
          correct++; idx++; combo++;
          if (combo >= 3) Audio2.combo(combo);
          Celebrate.smallWin(() => ask(), combo);
        },
        onWrong: (q) => {
          idx++; combo = 0;
          // Teach, never punish — then move on
          Celebrate.gentleExplain(q.explain, () => ask());
        }
      });
    };

    intro();
  },

  /* Question renderer --------------------------------------------------------- */

  renderQuestion(opts) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const q = opts.q;
    const screen = U.el('div', 'screen level-screen');
    screen.appendChild(Level.topBar(opts.title, () => { Audio2.stop(); opts.backTo(); }));

    // progress beads
    const beads = U.el('div', 'beads');
    for (let i = 0; i < opts.progress.total; i++) {
      beads.appendChild(U.el('span', 'bead' + (i < opts.progress.done ? ' done' : i === opts.progress.done ? ' now' : '')));
    }
    screen.appendChild(beads);

    const card = U.el('div', 'question-card');
    card.appendChild(U.el('div', 'phase-chip ' + (opts.phase.cls || ''), opts.phase.label));

    if (q.passage) {
      card.insertAdjacentHTML('beforeend', passageHTML(q.passage));
    }
    if (q.visual) {
      const v = U.el('div', 'q-visual');
      v.innerHTML = q.visual;
      card.appendChild(v);
    }

    const promptRow = U.el('div', 'prompt-row');
    const replay = U.el('button', 'replay-btn', '🔊');
    replay.setAttribute('aria-label', 'Hear the question again');
    replay.addEventListener('click', () => Activities.speakQuestion(q));
    promptRow.appendChild(replay);
    promptRow.appendChild(U.el('div', 'prompt-text', U.esc(q.prompt)));
    card.appendChild(promptRow);

    const answerBox = U.el('div', 'answer-box');
    card.appendChild(answerBox);

    if (opts.hints) {
      const hintBtn = U.el('button', 'hint-btn', '💡 Hint');
      hintBtn.addEventListener('click', () => {
        Audio2.say(q.explain || q.say || q.prompt);
        const h = U.el('div', 'hint-bubble', U.esc(q.explain || ''));
        card.appendChild(h);
        hintBtn.disabled = true;
      });
      card.appendChild(hintBtn);
    }

    screen.appendChild(card);
    app.appendChild(screen);

    let answered = false;
    const replayQuestion = (newQ) => {
      Level.renderQuestion(Object.assign({}, opts, { q: newQ || q }));
    };

    Activities.render(answerBox, q, (ok) => {
      if (answered) return;
      if (ok) {
        answered = true;
        Audio2.correct();
        opts.onCorrect();
      } else {
        Audio2.wrong();
        if (!opts.hints) {
          // Prove/quiz mode: one attempt per question
          answered = true;
          opts.onWrong(q, replayQuestion);
        }
        // Practice mode with format that allows retry in place (tap etc.): stay put.
        else if (q.format !== 'tap') {
          answered = true;
          opts.onWrong(q, replayQuestion);
        } else {
          // tap format: let her keep trying — explain gently in audio AND on screen
          Audio2.say(q.explain || 'Try another one!');
          if (q.explain && !card.querySelector('.hint-bubble')) {
            card.appendChild(U.el('div', 'hint-bubble', U.esc(q.explain)));
          }
        }
      }
    });

    // Auto-narrate per region audio policy: early regions read everything aloud,
    // later regions only audio-based questions — the replay button always works.
    const audioLevel = (Level.current && (Level.current.level ? Level.current.level.region.audio
      : Level.current.region ? Level.current.region.audio : 'full')) || 'full';
    if (audioLevel === 'full' || audioLevel === 'partial' && q.format !== 'tap' || q.audioOnly) {
      Activities.speakQuestion(q);
    }
  },

  topBar(title, onBack) {
    Activities.unbindKeys(); // drop any keyboard handler from a previous question
    const bar = U.el('div', 'top-bar');
    const back = U.el('button', 'back-btn', '←');
    back.setAttribute('aria-label', 'Go back');
    back.addEventListener('click', onBack);
    bar.appendChild(back);
    bar.appendChild(U.el('div', 'top-title', title));
    const hud = U.el('div', 'top-hud',
      `<span class="hud-chip">⭐ ${Store.state.totalStars}</span><span class="hud-chip">🪙 ${Store.state.coins}</span>`);
    bar.appendChild(hud);
    return bar;
  }
};

function passageHTML(p) {
  return `<div class="passage"><div class="passage-title">${p.emoji || '📖'} ${U.esc(p.title)}</div><div class="passage-text">${U.esc(p.text)}</div></div>`;
}
