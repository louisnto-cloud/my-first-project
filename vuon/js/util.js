/*
 * util.js — Tiny helpers shared across the app. No dependencies.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  // Create an element: el('div', {class:'x', text:'hi'}, [child, ...])
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'on' && attrs[k]) {
          for (var ev in attrs[k]) node.addEventListener(ev, attrs[k][ev]);
        } else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(arr, n) { return shuffle(arr).slice(0, n); }

  function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // True when fades should be suppressed: parent turned motion off OR the OS
  // requests reduced motion. When true the app swaps content instantly.
  function motionOff() {
    if (!VLA.state.settings().motion) return true;
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // Fade the app root out, run swap(), fade back in — or swap instantly when
  // motion is off. Always ends in the new content; never leaves things blank.
  function transition(container, swap) {
    if (motionOff()) { clear(container); swap(container); return; }
    container.classList.add('fading-out');
    var done = false;
    var finish = function () {
      if (done) return; done = true;
      container.removeEventListener('transitionend', finish);
      clear(container);
      swap(container);
      // next frame -> fade in
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { container.classList.remove('fading-out'); });
      });
    };
    container.addEventListener('transitionend', finish);
    setTimeout(finish, 420); // safety net if transitionend never fires
  }

  VLA.util = {
    el: el, clear: clear, randInt: randInt, shuffle: shuffle,
    sample: sample, pickOne: pickOne, motionOff: motionOff, transition: transition
  };
})();
