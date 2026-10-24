/*
 * state.js — All persistent state, saved to localStorage.
 *
 * Nothing is ever lost: progress, settings and the sticker collection all
 * survive a refresh or a closed tab. Every write is immediately flushed.
 * If localStorage is unavailable (private mode), we fall back to an in-memory
 * store so the app still runs for the session.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  var KEY = 'vla.khu-vuon-nho.v1';

  var DEFAULTS = {
    settings: {
      sound: false,        // Law 4: sound OFF by default.
      motion: true,        // fades on (respects prefers-reduced-motion separately).
      choices: 3,          // 2 or 3 answer choices.
      praise: true,        // show praise TEXT (turtle + green always happen).
      sessionLength: 5     // tokens per session: 3, 5 or 8.
    },
    progress: {
      // per path: current step index + clean-session tally per step id.
      numbers: { current: 0, clean: {} },
      letters: { current: 0, clean: {} }
    },
    stickers: { counts: {}, order: [] },  // animal key -> count, plus first-earned order.
    usage: { days: [] }                    // ISO date strings the app was used.
  };

  var mem = null; // in-memory fallback

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function readRaw() {
    try {
      var s = window.localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return mem; }
  }
  function writeRaw(obj) {
    mem = obj;
    try { window.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* memory only */ }
  }

  // Deep-merge stored data onto defaults so new fields always exist.
  function hydrate(stored) {
    var base = clone(DEFAULTS);
    if (!stored) return base;
    if (stored.settings) for (var k in base.settings) if (k in stored.settings) base.settings[k] = stored.settings[k];
    ['numbers', 'letters'].forEach(function (p) {
      if (stored.progress && stored.progress[p]) {
        base.progress[p].current = stored.progress[p].current || 0;
        base.progress[p].clean = stored.progress[p].clean || {};
      }
    });
    if (stored.stickers) {
      base.stickers.counts = stored.stickers.counts || {};
      base.stickers.order = stored.stickers.order || [];
    }
    if (stored.usage) base.usage.days = stored.usage.days || [];
    return base;
  }

  var data = hydrate(readRaw());
  function save() { writeRaw(data); }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  VLA.state = {
    // ---- settings ----
    settings: function () { return data.settings; },
    setSetting: function (key, value) { data.settings[key] = value; save(); },

    // ---- progress ----
    progress: function (pathId) { return data.progress[pathId]; },
    currentStepIndex: function (pathId) { return data.progress[pathId].current; },

    // Record the outcome of a finished session. `wasClean` means the child
    // finished with one or zero guided answers. A step is mastered after two
    // clean sessions, at which point the chain advances by one.
    recordSession: function (pathId, stepId, wasClean) {
      var p = data.progress[pathId];
      if (wasClean) {
        p.clean[stepId] = (p.clean[stepId] || 0) + 1;
        var steps = VLA.data.paths[pathId].steps;
        var idx = steps.findIndex(function (s) { return s.id === stepId; });
        // Only advance if this was the current step and it just reached mastery.
        if (idx === p.current && p.clean[stepId] >= 2 && p.current < steps.length - 1) {
          p.current += 1;
        }
      }
      save();
    },
    isMastered: function (pathId, stepId) { return (data.progress[pathId].clean[stepId] || 0) >= 2; },
    stepsCompleted: function (pathId) {
      var steps = VLA.data.paths[pathId].steps, n = 0;
      for (var i = 0; i < steps.length; i++) if ((data.progress[pathId].clean[steps[i].id] || 0) >= 2) n++;
      return n;
    },

    // ---- stickers ----
    stickers: function () { return data.stickers; },
    addSticker: function (key) {
      if (!data.stickers.counts[key]) { data.stickers.counts[key] = 0; data.stickers.order.push(key); }
      data.stickers.counts[key] += 1;
      save();
    },
    stickerTotal: function () {
      var t = 0, c = data.stickers.counts;
      for (var k in c) t += c[k];
      return t;
    },

    // ---- usage ----
    markUsedToday: function () {
      var t = todayISO();
      if (data.usage.days.indexOf(t) === -1) { data.usage.days.push(t); save(); }
    },
    daysThisWeek: function () {
      var now = new Date(); var cutoff = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
      cutoff.setHours(0, 0, 0, 0);
      return data.usage.days.filter(function (d) {
        var parts = d.split('-'); var dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return dt >= cutoff;
      }).length;
    }
  };
})();
