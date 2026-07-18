/*
 * screens.js — The non-activity screens and the router that ties everything
 * together.
 *
 * Screens: Home, Sticker reward, Break (overlay), Parent area (overlay).
 * The router (VLA.app) owns navigation. Break and Parent are OVERLAYS layered
 * on top of the current screen, so entering/leaving them never loses the
 * child's place (Law 2 / regulation support).
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};
  var U = VLA.util, el = U.el, C = VLA.components;

  var root, overlayLayer;

  /* ============================== HOME ============================== */

  function renderHome() {
    VLA.audio.stop();
    var s = VLA.strings;

    var cards = VLA.data.pathOrder.map(function (pid) {
      var path = VLA.data.paths[pid];
      return el('button', {
        class: 'home-card home-card-' + pid, type: 'button',
        'aria-label': path.label,
        on: { click: function () { VLA.app.startPath(pid); } }
      }, [
        el('div', { class: 'home-card-icon', html: VLA.svg(path.icon) }),
        el('div', { class: 'home-card-label', text: path.label })
      ]);
    });

    var shelf = buildStickerShelf();

    var screen = el('div', { class: 'home screen' }, [
      C.breakButton(VLA.app.openBreak),
      el('h1', { class: 'home-title', text: s.appName }),
      el('div', { class: 'home-cards' }, cards),
      shelf,
      turtleCorner(),
      C.parentGate(VLA.app.openParent)
    ]);

    U.transition(root, function (r) { r.appendChild(screen); });
  }

  function turtleCorner() {
    return el('div', { class: 'turtle', 'aria-hidden': 'true', html: VLA.svg('rua') });
  }

  function buildStickerShelf() {
    var st = VLA.state.stickers();
    var tiles = st.order.map(function (key) {
      var meta = VLA.data.stickers.filter(function (a) { return a.key === key; })[0] || { name: '' };
      var count = st.counts[key];
      return el('div', { class: 'shelf-tile', title: meta.name }, [
        el('div', { class: 'svg-box', html: VLA.svg(key) }),
        count > 1 ? el('div', { class: 'shelf-count', text: '×' + count }) : null
      ]);
    });
    // A few calm empty slots so the shelf reads as "room to grow".
    var emptyNeeded = Math.max(0, 4 - tiles.length);
    for (var i = 0; i < emptyNeeded; i++) tiles.push(el('div', { class: 'shelf-tile empty' }));

    return el('div', { class: 'shelf' }, [
      el('div', { class: 'shelf-title', text: VLA.strings.stickerTitle }),
      el('div', { class: 'shelf-row' }, tiles)
    ]);
  }

  /* ========================= STICKER REWARD ======================== */

  function renderStickerChoice() {
    VLA.audio.stop();
    // Offer three animals to choose from.
    var options = U.sample(VLA.data.stickers, 3);
    var cardsWrap = el('div', { class: 'sticker-choices' });

    options.forEach(function (animal) {
      var btn = el('button', {
        class: 'card sticker-option', type: 'button', 'aria-label': animal.name,
        on: {
          click: function () {
            if (cardsWrap.classList.contains('chosen')) return;
            cardsWrap.classList.add('chosen');
            btn.classList.add('picked');
            VLA.state.addSticker(animal.key);
            VLA.audio.chime();
            var delay = U.motionOff() ? 500 : 1200;
            setTimeout(VLA.app.home, delay);
          }
        }
      }, [el('div', { class: 'svg-box', html: VLA.svg(animal.key) })]);
      cardsWrap.appendChild(btn);
    });

    var screen = el('div', { class: 'sticker-screen screen' }, [
      C.breakButton(VLA.app.openBreak),
      el('div', { class: 'sticker-prompt', text: VLA.strings.stickerPick }),
      cardsWrap,
      turtleCorner()
    ]);

    U.transition(root, function (r) { r.appendChild(screen); });
    setTimeout(function () { VLA.audio.speak(VLA.strings.stickerPick); }, 400);
  }

  /* ============================= BREAK ============================= */

  var breakTimer = null;
  function openBreak() {
    if (document.querySelector('.break-overlay')) return;
    var s = VLA.strings;
    var circle = el('div', { class: 'breathe-circle' });
    var label = el('div', { class: 'breathe-label', text: s.breatheIn });

    var overlay = el('div', { class: 'break-overlay overlay' }, [
      el('div', { class: 'breathe-wrap' }, [circle, label]),
      el('button', {
        class: 'break-return', type: 'button', text: s.breakReturn,
        on: { click: closeBreak }
      })
    ]);
    overlayLayer.appendChild(overlay);

    // 8-second rhythm: 4s in, 4s out. Text alternates in step with the circle.
    var phase = 0;
    function tick() {
      phase = 1 - phase;
      label.textContent = phase === 0 ? s.breatheIn : s.breatheOut;
    }
    if (!U.motionOff()) circle.classList.add('breathing');
    label.textContent = s.breatheIn;
    breakTimer = setInterval(tick, 4000);
  }
  function closeBreak() {
    if (breakTimer) { clearInterval(breakTimer); breakTimer = null; }
    var o = document.querySelector('.break-overlay');
    if (o) o.parentNode.removeChild(o);
  }

  /* ========================== PARENT AREA ========================= */

  function openParent() {
    if (document.querySelector('.parent-overlay')) return;
    var s = VLA.strings.parent;
    var set = VLA.state.settings();

    function toggleRow(label, key) {
      var value = set[key];
      var btn = el('button', {
        class: 'toggle' + (value ? ' on' : ''), type: 'button',
        'aria-pressed': value ? 'true' : 'false',
        on: { click: function () {
          value = !value;
          VLA.state.setSetting(key, value);
          if (key === 'motion' && VLA.applyMotion) VLA.applyMotion();
          btn.classList.toggle('on', value);
          btn.setAttribute('aria-pressed', value ? 'true' : 'false');
          knob.textContent = value ? VLA.strings.parent.on : VLA.strings.parent.off;
        } }
      });
      var knob = el('span', { class: 'toggle-knob', text: value ? VLA.strings.parent.on : VLA.strings.parent.off });
      btn.appendChild(knob);
      return el('div', { class: 'setting-row' }, [el('span', { class: 'setting-label', text: label }), btn]);
    }

    function segRow(label, key, values) {
      var current = set[key];
      var seg = el('div', { class: 'segmented' });
      values.forEach(function (v) {
        var b = el('button', {
          class: 'seg' + (v === current ? ' active' : ''), type: 'button', text: String(v),
          on: { click: function () {
            current = v; VLA.state.setSetting(key, v);
            seg.querySelectorAll('.seg').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
          } }
        });
        seg.appendChild(b);
      });
      return el('div', { class: 'setting-row' }, [el('span', { class: 'setting-label', text: label }), seg]);
    }

    var settingsBlock = el('div', { class: 'parent-block' }, [
      el('h3', { text: s.settingsTitle }),
      toggleRow(s.sound, 'sound'),
      toggleRow(s.motion, 'motion'),
      toggleRow(s.praise, 'praise'),
      segRow(s.choices, 'choices', [2, 3]),
      segRow(s.sessionLength, 'sessionLength', [3, 5, 8])
    ]);

    var progressBlock = el('div', { class: 'parent-block' }, [
      el('h3', { text: s.progressTitle }),
      progressLines()
    ]);

    var explainBlock = el('div', { class: 'parent-block explain' }, [
      el('h3', { text: s.explainTitle }),
      el('p', { text: s.explainBody })
    ]);

    var overlay = el('div', { class: 'parent-overlay overlay' }, [
      el('div', { class: 'parent-panel' }, [
        el('div', { class: 'parent-head' }, [
          el('h2', { text: s.title }),
          el('button', { class: 'parent-close', type: 'button', text: s.close, on: { click: closeParent } })
        ]),
        settingsBlock,
        progressBlock,
        explainBlock
      ])
    ]);
    overlayLayer.appendChild(overlay);
  }

  function progressLines() {
    var s = VLA.strings.parent;
    var wrap = el('div', { class: 'progress-grid' });
    VLA.data.pathOrder.forEach(function (pid) {
      var path = VLA.data.paths[pid];
      var idx = VLA.state.currentStepIndex(pid);
      var step = path.steps[idx];
      var done = VLA.state.stepsCompleted(pid);
      wrap.appendChild(el('div', { class: 'progress-card' }, [
        el('div', { class: 'progress-path', text: pid === 'numbers' ? s.pathNumbers : s.pathLetters }),
        el('div', { class: 'progress-line' }, [el('span', { text: s.currentStep + ': ' }), el('strong', { text: step.title })]),
        el('div', { class: 'progress-line', text: s.stepsDone + ': ' + done + '/' + path.steps.length })
      ]));
    });
    wrap.appendChild(el('div', { class: 'progress-card' }, [
      el('div', { class: 'progress-line', text: s.stickersEarned + ': ' + VLA.state.stickerTotal() }),
      el('div', { class: 'progress-line', text: s.daysThisWeek + ': ' + VLA.state.daysThisWeek() })
    ]));
    return wrap;
  }

  function closeParent() {
    var o = document.querySelector('.parent-overlay');
    if (o) o.parentNode.removeChild(o);
  }

  /* ============================ ROUTER ============================= */

  VLA.app = {
    start: function () {
      root = document.getElementById('app');
      overlayLayer = document.getElementById('overlay-layer');
      renderHome();
    },
    home: renderHome,
    startPath: function (pid) {
      VLA.audio.unlock();
      VLA.engine.startSession(pid, root, {
        onBreak: openBreak,
        onParent: openParent,
        onComplete: renderStickerChoice
      });
    },
    openBreak: openBreak,
    closeBreak: closeBreak,
    openParent: openParent,
    closeParent: closeParent
  };
})();
