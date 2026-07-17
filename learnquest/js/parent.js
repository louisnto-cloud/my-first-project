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

    const streak = Store.state.streak;
    wrap.appendChild(U.el('div', 'parent-card',
      `<h3>🔥 Streak</h3><div class="parent-row"><span>Current</span><b>${streak.count} day${streak.count === 1 ? '' : 's'}</b></div>
       <div class="parent-row"><span>Best</span><b>${streak.best} day${streak.best === 1 ? '' : 's'}</b></div>`));

    screen.appendChild(wrap);
    app.appendChild(screen);
  }
};
