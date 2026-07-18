/* LearnQuest — progress engine backed by localStorage */
'use strict';

const Store = {
  KEY: 'learnquest-v1',
  state: null,

  defaults() {
    return {
      coins: 0,
      totalStars: 0,
      stars: {},          // levelId -> 1..3
      completed: {},      // levelId -> true
      bossPassed: {},     // regionId -> true
      fastTracked: {},    // regionId -> true
      trophies: [],       // regionIds in order earned
      avatar: { equipped: {}, owned: ['base'] },
      decorOwned: [],
      gamesOwned: [],
      streak: { count: 0, last: null, best: 0 },
      activity: {},       // 'YYYY-MM-DD' -> levels completed that day
      settings: { muted: false },
      name: ''
    };
  },

  load() {
    const d = Store.defaults();
    try {
      const raw = localStorage.getItem(Store.KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved === 'object') {
        // Deep-merge one level so old saves keep working when new nested
        // fields are added to the schema in future versions.
        Object.keys(saved).forEach(k => {
          if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) &&
              saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k])) {
            d[k] = Object.assign({}, d[k], saved[k]);
          } else if (saved[k] !== undefined) {
            d[k] = saved[k];
          }
        });
      }
      Store.state = d;
    } catch (e) {
      Store.state = d;
    }
    Audio2.muted = !!Store.state.settings.muted;
    return Store.state;
  },

  save() {
    try { localStorage.setItem(Store.KEY, JSON.stringify(Store.state)); } catch (e) { /* storage full/blocked */ }
  },

  // Streak as it stands right now: 0 if the chain lapsed (no play yesterday or today)
  currentStreak() {
    const s = Store.state.streak;
    if (s.last === U.todayKey() || s.last === U.dayKeyOffset(-1)) return s.count;
    return 0;
  },

  touchStreak() {
    const s = Store.state.streak;
    const today = U.todayKey();
    if (s.last === today) return;
    s.count = (s.last === U.dayKeyOffset(-1)) ? s.count + 1 : 1;
    s.last = today;
    if (s.count > s.best) s.best = s.count;
    Store.save();
  },

  logActivity() {
    const k = U.todayKey();
    Store.state.activity[k] = (Store.state.activity[k] || 0) + 1;
    // prune entries older than 60 days
    const cutoff = U.dayKeyOffset(-60);
    Object.keys(Store.state.activity).forEach(d => { if (d < cutoff) delete Store.state.activity[d]; });
    Store.save();
  },

  // Record a level result. Returns {newStars, coinsEarned}
  completeLevel(levelId, stars) {
    const st = Store.state;
    const prev = st.stars[levelId] || 0;
    const gained = Math.max(0, stars - prev);
    // Replays with no new stars still earn a little — practice always pays
    const coinsEarned = gained * 10 + (prev === 0 ? 5 : 0) + (gained === 0 && prev > 0 ? 3 : 0);
    st.stars[levelId] = Math.max(prev, stars);
    st.completed[levelId] = true;
    st.totalStars += gained;
    st.coins += coinsEarned;
    Store.touchStreak();
    Store.logActivity();
    Store.save();
    return { newStars: stars, coinsEarned };
  },

  passBoss(regionId) {
    const st = Store.state;
    if (!st.bossPassed[regionId]) {
      st.bossPassed[regionId] = true;
      st.trophies.push(regionId);
      st.coins += 50;
      Store.touchStreak();
      Store.logActivity();
      Store.save();
      return 50;
    }
    Store.save();
    return 0;
  },

  fastTrack(regionId, region) {
    const st = Store.state;
    st.fastTracked[regionId] = true;
    // mark all region levels complete with 3 stars
    region.levels.forEach(lv => {
      if (!st.completed[lv.id]) {
        st.completed[lv.id] = true;
        st.stars[lv.id] = 3;
        st.totalStars += 3;
      }
    });
    if (!st.bossPassed[regionId]) { st.bossPassed[regionId] = true; st.trophies.push(regionId); }
    st.coins += 80;
    Store.touchStreak();
    Store.logActivity();
    Store.save();
  },

  spend(amount) {
    if (Store.state.coins < amount) return false;
    Store.state.coins -= amount;
    Store.save();
    return true;
  },

  isLevelUnlocked(world, region, idx) {
    if (!Store.isRegionUnlocked(world, region)) return false;
    if (idx === 0) return true;
    const prev = region.levels[idx - 1];
    return !!Store.state.completed[prev.id];
  },

  isRegionUnlocked(world, region) {
    const regions = world.regions;
    const i = regions.indexOf(region);
    if (i === 0) return true;
    return !!Store.state.bossPassed[regions[i - 1].id];
  },

  isRegionComplete(region) {
    return !!Store.state.bossPassed[region.id];
  },

  regionProgress(region) {
    const done = region.levels.filter(lv => Store.state.completed[lv.id]).length;
    return { done, total: region.levels.length };
  },

  bossUnlocked(region) {
    return region.levels.every(lv => Store.state.completed[lv.id]);
  },

  last7Days() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const k = U.dayKeyOffset(-i);
      out.push({ day: k, count: Store.state.activity[k] || 0 });
    }
    return out;
  },

  reset() {
    localStorage.removeItem(Store.KEY);
    Store.load();
  }
};
