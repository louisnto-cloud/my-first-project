/* LearnQuest — parent view: one clean progress screen, hold-to-open gated */
'use strict';

const Parent = {
  show() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = U.el('div', 'screen parent-screen');
    screen.appendChild(Level.topBar('Parent View', () => WorldMap.showHome()));

    const wrap = U.el('div', 'parent-wrap');

    CURRICULUM.forEach(world => {
      const card = U.el('div', 'parent-card');
      // current region = first not-complete unlocked region
      let current = world.regions[0];
      for (const r of world.regions) {
        current = r;
        if (!Store.state.bossPassed[r.id]) break;
      }
      const totalLevels = world.regions.reduce((s, r) => s + r.levels.length, 0);
      const doneLevels = world.regions.reduce((s, r) => s + r.levels.filter(lv => Store.state.completed[lv.id]).length, 0);
      const bosses = world.regions.filter(r => Store.state.bossPassed[r.id]).length;
      const curProg = Store.regionProgress(current);

      card.innerHTML = `
        <h3>${world.emoji} ${U.esc(world.name)} <span class="parent-sub">(${world.id === 'math' ? 'Mathematics' : 'English Language Arts'})</span></h3>
        <div class="parent-row"><span>Current region</span><b>Grade ${current.grade} — ${U.esc(current.name)}${Store.state.fastTracked[current.id] ? ' (fast-tracked)' : ''}</b></div>
        <div class="parent-row"><span>Levels in current region</span><b>${curProg.done} / ${curProg.total}</b></div>
        <div class="parent-row"><span>Levels overall</span><b>${doneLevels} / ${totalLevels}</b></div>
        <div class="parent-row"><span>Boss Challenges passed</span><b>${bosses} / 8</b></div>`;
      wrap.appendChild(card);
    });

    // Last 7 days activity chart
    const days = Store.last7Days();
    const max = Math.max(1, ...days.map(d => d.count));
    const chart = U.el('div', 'parent-card');
    chart.innerHTML = '<h3>📅 Last 7 days <span class="parent-sub">(levels completed per day)</span></h3>';
    const bars = U.el('div', 'week-chart');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
      const col = U.el('div', 'week-col');
      const h = Math.round((d.count / max) * 90);
      const dayName = dayNames[new Date(d.day + 'T12:00:00').getDay()];
      col.innerHTML = `<div class="week-count">${d.count || ''}</div>
        <div class="week-bar" style="height:${Math.max(4, h)}px"></div>
        <div class="week-day">${dayName}</div>`;
      bars.appendChild(col);
    });
    chart.appendChild(bars);
    wrap.appendChild(chart);

    const cur = Store.currentStreak(), best = Store.state.streak.best;
    const totalStars = Store.state.totalStars;
    wrap.appendChild(U.el('div', 'parent-card',
      `<h3>🔥 Streak &amp; stars</h3>
       <div class="parent-row"><span>Current streak</span><b>${cur} day${cur === 1 ? '' : 's'}</b></div>
       <div class="parent-row"><span>Best streak</span><b>${best} day${best === 1 ? '' : 's'}</b></div>
       <div class="parent-row"><span>Total stars earned</span><b>⭐ ${totalStars}</b></div>
       <div class="parent-row"><span>Coins</span><b>🪙 ${Store.state.coins}</b></div>`));

    // ---- Settings ----
    const set = U.el('div', 'parent-card');
    set.innerHTML = '<h3>⚙️ Settings</h3>';

    // Narration speed
    const speedRow = U.el('div', 'setting-row');
    speedRow.innerHTML = '<span>Narration speed</span>';
    const speedBtns = U.el('div', 'seg-btns');
    [['Slow', 0.72], ['Normal', 0.92], ['Lively', 1.12]].forEach(([label, rate]) => {
      const active = Math.abs((Store.state.settings.narrationRate || 0.92) - rate) < 0.01;
      const b = U.el('button', 'seg-btn' + (active ? ' on' : ''), label);
      b.addEventListener('click', () => {
        Store.state.settings.narrationRate = rate;
        Store.save();
        Audio2.say('This is how fast I will talk.');
        Parent.show();
      });
      speedBtns.appendChild(b);
    });
    speedRow.appendChild(speedBtns);
    set.appendChild(speedRow);

    // Daily goal
    const goalRow = U.el('div', 'setting-row');
    goalRow.innerHTML = '<span>Daily goal (levels)</span>';
    const goalBtns = U.el('div', 'seg-btns');
    [1, 3, 5].forEach(g => {
      const active = (Store.state.dailyGoal || 3) === g;
      const b = U.el('button', 'seg-btn' + (active ? ' on' : ''), String(g));
      b.addEventListener('click', () => { Store.state.dailyGoal = g; Store.save(); Parent.show(); });
      goalBtns.appendChild(b);
    });
    goalRow.appendChild(goalBtns);
    set.appendChild(goalRow);

    // Reduce motion
    const motionRow = U.el('div', 'setting-row');
    motionRow.innerHTML = '<span>Calmer animations</span>';
    const motionToggle = U.el('button', 'toggle' + (Store.state.settings.reduceMotion ? ' on' : ''),
      Store.state.settings.reduceMotion ? 'On' : 'Off');
    motionToggle.addEventListener('click', () => {
      Store.state.settings.reduceMotion = !Store.state.settings.reduceMotion;
      Store.save();
      if (window.applyMotionPref) window.applyMotionPref();
      Parent.show();
    });
    motionRow.appendChild(motionToggle);
    set.appendChild(motionRow);

    // Sound
    const soundRow = U.el('div', 'setting-row');
    soundRow.innerHTML = '<span>Sound &amp; voice</span>';
    const soundToggle = U.el('button', 'toggle' + (!Audio2.muted ? ' on' : ''), Audio2.muted ? 'Off' : 'On');
    soundToggle.addEventListener('click', () => {
      Audio2.muted = !Audio2.muted;
      Store.state.settings.muted = Audio2.muted;
      Store.save();
      Parent.show();
    });
    soundRow.appendChild(soundToggle);
    set.appendChild(soundRow);

    wrap.appendChild(set);

    // ---- Manage ----
    const manage = U.el('div', 'parent-card');
    manage.innerHTML = '<h3>🛠️ Manage</h3>';

    const replayBtn = U.el('button', 'manage-btn', '🔁 Replay the welcome intro');
    replayBtn.addEventListener('click', () => {
      Store.state.name = '';
      Store.save();
      location.reload();
    });
    manage.appendChild(replayBtn);

    const resetBtn = U.el('button', 'manage-btn danger', '🗑️ Reset all progress');
    let armed = false;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        resetBtn.textContent = '⚠️ Tap again to erase everything';
        resetBtn.classList.add('armed');
        setTimeout(() => { armed = false; resetBtn.textContent = '🗑️ Reset all progress'; resetBtn.classList.remove('armed'); }, 4000);
        return;
      }
      Store.reset();
      location.reload();
    });
    manage.appendChild(resetBtn);
    manage.appendChild(U.el('div', 'parent-note-sm', 'Resetting clears all levels, stars, coins, and the avatar. This cannot be undone.'));

    wrap.appendChild(manage);

    screen.appendChild(wrap);
    app.appendChild(screen);
  }
};
