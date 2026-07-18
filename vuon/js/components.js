/*
 * components.js — Small, reusable pieces that must look and sit IDENTICALLY
 * on every screen (Law 2: total predictability).
 *
 *  - First → Then strip  (top of every activity)
 *  - Token board          (5 circles filling left to right)
 *  - Turtle companion     (same bottom-right corner, slow nod on success)
 *  - Break button (Nghỉ)  (same top-left spot on every screen)
 *  - Parent gate          (discreet 3-second press-and-hold corner)
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};
  var el = function () { return VLA.util.el.apply(null, arguments); };

  function svgBox(key, cls) {
    return el('div', { class: 'svg-box ' + (cls || ''), html: VLA.svg(key) });
  }

  // First → Then: "BÂY GIỜ [task icon]  →  SAU ĐÓ [sticker icon]"
  function firstThen(step) {
    var s = VLA.strings;
    return el('div', { class: 'first-then', 'aria-hidden': 'true' }, [
      el('div', { class: 'ft-cell' }, [
        el('div', { class: 'ft-label', text: s.firstLabel }),
        svgBox(step.icon, 'ft-icon')
      ]),
      el('div', { class: 'ft-arrow', text: '→' }),
      el('div', { class: 'ft-cell' }, [
        el('div', { class: 'ft-label', text: s.thenLabel }),
        svgBox('sao', 'ft-icon reward')
      ])
    ]);
  }

  // Token board: `total` circles; call fill(n) to fill the first n.
  function tokenBoard(total) {
    var dots = [];
    var wrap = el('div', { class: 'token-board', 'aria-hidden': 'true' });
    for (var i = 0; i < total; i++) {
      var d = el('div', { class: 'token' });
      dots.push(d); wrap.appendChild(d);
    }
    return {
      node: wrap,
      fill: function (n) { for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('filled', i < n); }
    };
  }

  // Turtle companion — always same corner; nod() plays a slow happy nod.
  function turtle() {
    var node = el('div', { class: 'turtle', 'aria-hidden': 'true', html: VLA.svg('rua') });
    return {
      node: node,
      nod: function () {
        if (VLA.util.motionOff()) return;
        node.classList.remove('nodding');
        void node.offsetWidth; // restart animation
        node.classList.add('nodding');
      }
    };
  }

  // Break button — identical position and label on every screen.
  function breakButton(onBreak) {
    return el('button', {
      class: 'break-btn', type: 'button', 'aria-label': VLA.strings.breakButton,
      on: { click: onBreak }
    }, [
      el('span', { class: 'break-icon', html: VLA.svg('la') }),
      el('span', { class: 'break-text', text: VLA.strings.breakButton })
    ]);
  }

  // Parent gate — a discreet corner target. Press and hold 3 seconds to open.
  // Deliberately quiet: it must never be an obvious tappable child target.
  function parentGate(onOpen) {
    var node = el('div', { class: 'parent-gate', 'aria-label': 'phụ huynh', role: 'button', tabindex: '-1' });
    var timer = null, ring = el('div', { class: 'gate-ring' });
    node.appendChild(ring);
    function start(e) {
      e.preventDefault();
      node.classList.add('holding');
      timer = setTimeout(function () { node.classList.remove('holding'); onOpen(); }, 3000);
    }
    function cancel() { node.classList.remove('holding'); if (timer) { clearTimeout(timer); timer = null; } }
    node.addEventListener('pointerdown', start);
    node.addEventListener('pointerup', cancel);
    node.addEventListener('pointerleave', cancel);
    node.addEventListener('pointercancel', cancel);
    return node;
  }

  VLA.components = {
    firstThen: firstThen, tokenBoard: tokenBoard, turtle: turtle,
    breakButton: breakButton, parentGate: parentGate, svgBox: svgBox
  };
})();
