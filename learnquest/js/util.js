/* LearnQuest — shared utilities */
'use strict';

const U = {
  // Random helpers
  ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  pickN(arr, n) { return U.shuffle(arr.slice()).slice(0, n); },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  // Build a set of wrong numeric choices near the answer
  distractors(answer, count, min = 0, max = Infinity) {
    const set = new Set();
    let guard = 0;
    while (set.size < count && guard++ < 200) {
      let d = answer + U.pick([-3, -2, -1, 1, 2, 3, U.ri(-10, 10) || 1]);
      if (d !== answer && d >= min && d <= max) set.add(d);
    }
    let extra = answer + count + 1;
    while (set.size < count) { if (extra !== answer && extra >= min) set.add(extra); extra++; }
    return [...set];
  },
  // Make multiple-choice list from answer + distractors
  choicesFrom(answer, wrongs, fmt) {
    fmt = fmt || (x => String(x));
    const ch = wrongs.map(w => ({ label: fmt(w), correct: false }));
    ch.push({ label: fmt(answer), correct: true });
    return U.shuffle(ch);
  },
  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  // True when the child (or parent setting) prefers less animation
  reduceMotion() {
    if (typeof Store !== 'undefined' && Store.state && Store.state.settings.reduceMotion) return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  },
  gcd(a, b) { return b ? U.gcd(b, a % b) : a; },
  round(n, d) { const f = Math.pow(10, d); return Math.round(n * f) / f; },
  todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  dayKeyOffset(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  numberWord(n) {
    const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
      'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
    return n <= 20 ? words[n] : String(n);
  },
  emojiGroup(emoji, n, wrap) {
    let h = '<div class="emoji-group' + (wrap === false ? ' nowrap' : '') + '">';
    for (let i = 0; i < n; i++) h += '<span class="eg-item" style="animation-delay:' + (i * 60) + 'ms">' + emoji + '</span>';
    return h + '</div>';
  },
  clockSVG(h, m) {
    const cx = 60, cy = 60, r = 54;
    const mAng = (m / 60) * 2 * Math.PI - Math.PI / 2;
    const hAng = ((h % 12) / 12 + m / 720) * 2 * Math.PI - Math.PI / 2;
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const nx = cx + Math.cos(a) * (r - 11), ny = cy + Math.sin(a) * (r - 11) + 4;
      ticks += `<text x="${nx}" y="${ny}" text-anchor="middle" font-size="11" font-weight="700" fill="#5b5570">${i === 0 ? 12 : i}</text>`;
    }
    return `<svg viewBox="0 0 120 120" class="clock-svg" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffaf2" stroke="#e8ded0" stroke-width="4"/>${ticks}
      <line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(hAng) * 26}" y2="${cy + Math.sin(hAng) * 26}" stroke="#3d3554" stroke-width="5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(mAng) * 40}" y2="${cy + Math.sin(mAng) * 40}" stroke="#ff7a59" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#3d3554"/></svg>`;
  },
  angleSVG(deg) {
    const cx = 70, cy = 90, len = 62;
    const a = -deg * Math.PI / 180;
    const x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len;
    const arcR = 22;
    const ax = cx + arcR, ay = cy;
    const bx = cx + Math.cos(a) * arcR, by = cy + Math.sin(a) * arcR;
    const large = deg > 180 ? 1 : 0;
    return `<svg viewBox="0 0 140 110" class="angle-svg" aria-hidden="true">
      <line x1="${cx}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="#3d3554" stroke-width="4" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#3d3554" stroke-width="4" stroke-linecap="round"/>
      <path d="M ${ax} ${ay} A ${arcR} ${arcR} 0 ${large} 0 ${bx} ${by}" fill="none" stroke="#ff7a59" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#3d3554"/></svg>`;
  },
  gridSVG(px, py, showPoint) {
    let lines = '', labels = '';
    const S = 24, O = 30, N = 6;
    for (let i = 0; i <= N; i++) {
      lines += `<line x1="${O + i * S}" y1="${O}" x2="${O + i * S}" y2="${O + N * S}" stroke="#e3dcec" stroke-width="1"/>`;
      lines += `<line x1="${O}" y1="${O + i * S}" x2="${O + N * S}" y2="${O + i * S}" stroke="#e3dcec" stroke-width="1"/>`;
      labels += `<text x="${O + i * S}" y="${O + N * S + 16}" text-anchor="middle" font-size="10" fill="#5b5570">${i}</text>`;
      labels += `<text x="${O - 12}" y="${O + (N - i) * S + 4}" text-anchor="middle" font-size="10" fill="#5b5570">${i}</text>`;
    }
    const pt = showPoint ? `<circle cx="${O + px * S}" cy="${O + (N - py) * S}" r="7" fill="#ff7a59" stroke="#fff" stroke-width="2"/>` : '';
    return `<svg viewBox="0 0 210 210" class="grid-svg" aria-hidden="true">
      ${lines}
      <line x1="${O}" y1="${O + N * S}" x2="${O + N * S}" y2="${O + N * S}" stroke="#3d3554" stroke-width="2.5"/>
      <line x1="${O}" y1="${O}" x2="${O}" y2="${O + N * S}" stroke="#3d3554" stroke-width="2.5"/>
      ${labels}${pt}</svg>`;
  },
  fractionSVG(num, den, kind) {
    kind = kind || 'circle';
    if (kind === 'circle') {
      const cx = 55, cy = 55, r = 48;
      let paths = '';
      for (let i = 0; i < den; i++) {
        const a1 = (i / den) * 2 * Math.PI - Math.PI / 2;
        const a2 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        const fill = i < num ? '#ffb14a' : '#f3eee6';
        if (den === 1) { paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#c9a36a" stroke-width="2"/>`; }
        else paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${fill}" stroke="#c9a36a" stroke-width="2"/>`;
      }
      return `<svg viewBox="0 0 110 110" class="frac-svg" aria-hidden="true">${paths}</svg>`;
    }
    // bar
    let rects = '';
    const w = 200 / den;
    for (let i = 0; i < den; i++) {
      rects += `<rect x="${5 + i * w}" y="8" width="${w}" height="44" fill="${i < num ? '#ffb14a' : '#f3eee6'}" stroke="#c9a36a" stroke-width="2" rx="4"/>`;
    }
    return `<svg viewBox="0 0 210 60" class="frac-bar-svg" aria-hidden="true">${rects}</svg>`;
  },
  barChartSVG(data) {
    // data: [{label, emoji, value}]
    const max = Math.max(...data.map(d => d.value));
    const bw = 44, gap = 22, H = 130, base = 150;
    let bars = '';
    data.forEach((d, i) => {
      const h = Math.max(8, (d.value / max) * H);
      const x = 20 + i * (bw + gap);
      bars += `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="8" fill="${['#ff7a59','#4ecdc4','#ffb14a','#9b8cff'][i % 4]}"/>`;
      bars += `<text x="${x + bw / 2}" y="${base + 22}" text-anchor="middle" font-size="18">${d.emoji}</text>`;
      bars += `<text x="${x + bw / 2}" y="${base - h - 7}" text-anchor="middle" font-size="13" font-weight="700" fill="#3d3554">${d.value}</text>`;
    });
    const w = 20 + data.length * (bw + gap);
    return `<svg viewBox="0 0 ${w + 10} 185" class="chart-svg" aria-hidden="true"><line x1="14" y1="${base}" x2="${w}" y2="${base}" stroke="#3d3554" stroke-width="2.5"/>${bars}</svg>`;
  },
  lineGraphSVG(points, labels) {
    const W = 240, H = 140, O = 34;
    const max = Math.max(...points);
    const step = (W - O - 10) / (points.length - 1);
    let path = '', dots = '', lbl = '';
    points.forEach((v, i) => {
      const x = O + i * step, y = 14 + (H - 34) * (1 - v / max);
      path += (i ? ' L ' : 'M ') + x + ' ' + y;
      dots += `<circle cx="${x}" cy="${y}" r="4.5" fill="#ff7a59" stroke="#fff" stroke-width="1.5"/>`;
      dots += `<text x="${x}" y="${y - 9}" text-anchor="middle" font-size="11" font-weight="700" fill="#3d3554">${v}</text>`;
      lbl += `<text x="${x}" y="${H + 8}" text-anchor="middle" font-size="10" fill="#5b5570">${labels[i]}</text>`;
    });
    return `<svg viewBox="0 0 ${W + 6} ${H + 16}" class="chart-svg" aria-hidden="true">
      <line x1="${O - 6}" y1="${H - 18}" x2="${W}" y2="${H - 18}" stroke="#c9c2d6" stroke-width="1.5"/>
      <path d="${path}" fill="none" stroke="#4ecdc4" stroke-width="3" stroke-linecap="round"/>${dots}${lbl}</svg>`;
  },
  spinnerSVG(sections) {
    // sections: [{color, emoji, count}] — draws wedges
    const total = sections.reduce((s, x) => s + x.count, 0);
    const cx = 60, cy = 60, r = 52;
    let paths = '', idx = 0;
    sections.forEach(sec => {
      for (let k = 0; k < sec.count; k++) {
        const a1 = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const a2 = ((idx + 1) / total) * 2 * Math.PI - Math.PI / 2;
        const mid = (a1 + a2) / 2;
        const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${sec.color}" stroke="#fff" stroke-width="2"/>`;
        paths += `<text x="${cx + Math.cos(mid) * r * 0.62}" y="${cy + Math.sin(mid) * r * 0.62 + 5}" text-anchor="middle" font-size="14">${sec.emoji}</text>`;
        idx++;
      }
    });
    return `<svg viewBox="0 0 120 120" class="spinner-svg" aria-hidden="true">${paths}<polygon points="60,2 54,16 66,16" fill="#3d3554"/></svg>`;
  },
  goalRingSVG(done, goal) {
    const pct = Math.max(0, Math.min(1, goal ? done / goal : 0));
    const r = 32, c = 2 * Math.PI * r;
    const off = c * (1 - pct);
    const complete = done >= goal;
    return `<svg viewBox="0 0 80 80" class="goal-ring" aria-hidden="true">
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="rgba(255,250,242,.18)" stroke-width="8"/>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${complete ? '#ffd34d' : '#4ecdc4'}" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 40 40)"/>
      <text x="40" y="37" text-anchor="middle" font-size="19">${complete ? '⭐' : '🎯'}</text>
      <text x="40" y="55" text-anchor="middle" font-size="15" font-weight="900" fill="#fff">${done}/${goal}</text>
    </svg>`;
  },

  numberLineSVG(min, max, mark) {
    const W = 280, O = 16;
    const step = (W - 2 * O) / (max - min);
    let ticks = '';
    for (let v = min; v <= max; v++) {
      const x = O + (v - min) * step;
      ticks += `<line x1="${x}" y1="30" x2="${x}" y2="${v % 5 === 0 || max - min <= 12 ? 20 : 25}" stroke="#3d3554" stroke-width="1.5"/>`;
      if (v % (max - min > 12 ? 5 : 1) === 0) ticks += `<text x="${x}" y="52" text-anchor="middle" font-size="11" fill="#5b5570">${v}</text>`;
    }
    const mx = O + (mark - min) * step;
    return `<svg viewBox="0 0 ${W} 60" class="numline-svg" aria-hidden="true">
      <line x1="${O - 6}" y1="30" x2="${W - O + 6}" y2="30" stroke="#3d3554" stroke-width="2.5"/>${ticks}
      <circle cx="${mx}" cy="30" r="7" fill="#ff7a59" stroke="#fff" stroke-width="2"/></svg>`;
  }
};
