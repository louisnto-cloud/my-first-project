/* LearnQuest — Math question template generators (BC K-7 aligned)
   Each generator returns a question object consumed by the activity engine:
   { format, prompt, say, visual?, choices?/answer?/pairs?/sequence?/bins+items?/blankText+bank?, explain } */
'use strict';

const OBJ = [
  { e: '🍎', n: 'apples', s: 'apple' }, { e: '⭐', n: 'stars', s: 'star' }, { e: '🐟', n: 'fish', s: 'fish' },
  { e: '🌸', n: 'flowers', s: 'flower' }, { e: '🎈', n: 'balloons', s: 'balloon' }, { e: '🐚', n: 'shells', s: 'shell' },
  { e: '🍄', n: 'mushrooms', s: 'mushroom' }, { e: '🦋', n: 'butterflies', s: 'butterfly' }, { e: '🍪', n: 'cookies', s: 'cookie' },
  { e: '🪙', n: 'coins', s: 'coin' }, { e: '🧁', n: 'cupcakes', s: 'cupcake' }, { e: '🐞', n: 'ladybugs', s: 'ladybug' }
];

const SHAPES2D = [
  { name: 'circle', svg: '<circle cx="50" cy="50" r="40" />', sides: 0 },
  { name: 'square', svg: '<rect x="12" y="12" width="76" height="76" rx="6"/>', sides: 4 },
  { name: 'triangle', svg: '<polygon points="50,10 92,88 8,88"/>', sides: 3 },
  { name: 'rectangle', svg: '<rect x="8" y="26" width="84" height="50" rx="5"/>', sides: 4 },
  { name: 'hexagon', svg: '<polygon points="50,8 88,30 88,70 50,92 12,70 12,30"/>', sides: 6 },
  { name: 'pentagon', svg: '<polygon points="50,8 92,40 76,90 24,90 8,40"/>', sides: 5 },
  { name: 'oval', svg: '<ellipse cx="50" cy="50" rx="44" ry="30"/>', sides: 0 },
  { name: 'diamond', svg: '<polygon points="50,6 90,50 50,94 10,50"/>', sides: 4 }
];
const SHAPE_COLORS = ['#ff7a59', '#4ecdc4', '#ffb14a', '#9b8cff', '#5fb0f2'];
function shapeSVG(sh, color) {
  return `<svg viewBox="0 0 100 100" class="shape-svg" aria-hidden="true"><g fill="${color || U.pick(SHAPE_COLORS)}" stroke="#3d3554" stroke-width="3" stroke-linejoin="round">${sh.svg}</g></svg>`;
}

const SOLIDS = [
  { name: 'cube', e: '🎲', faces: 6, net: 'six squares' },
  { name: 'sphere', e: '⚽', faces: 0, net: 'no flat faces' },
  { name: 'cylinder', e: '🥫', faces: 2, net: 'two circles and a rectangle' },
  { name: 'cone', e: '🍦', faces: 1, net: 'one circle and a curved piece' },
  { name: 'pyramid', e: '🔺', faces: 5, net: 'a square and four triangles' }
];

const KIDS = ['Maya', 'Theo', 'Priya', 'Sam', 'Zoe', 'Kai', 'Lena', 'Milo', 'Ava', 'Dev'];

// Canadian coins (BC financial-literacy strand)
const COINS = [
  { v: 5, label: '5¢', color: '#b9b9c7' },
  { v: 10, label: '10¢', color: '#cfcfd9' },
  { v: 25, label: '25¢', color: '#c2c2d0' },
  { v: 100, label: '$1', color: '#e6c064' },
  { v: 200, label: '$2', color: '#d9b25a' }
];
function coinsHTML(coins) {
  return '<div class="coins-row">' + coins.map(c =>
    `<span class="coin" style="--cc:${c.color}">${c.label}</span>`).join('') + '</div>';
}

const MG = {

  /* ---------- KINDERGARTEN ---------- */

  'count-objects': (p) => {
    const n = U.ri(p.min || 1, p.max || 10);
    const o = U.pick(OBJ);
    return {
      format: 'tap',
      prompt: 'How many?',
      say: `Count the ${o.n}. How many are there?`,
      visual: U.emojiGroup(o.e, n),
      choices: U.choicesFrom(n, U.distractors(n, 3, Math.max(0, (p.min || 1) - 1), (p.max || 10) + 2)),
      explain: `Touch each one as you count: one, two, three... There are ${n} ${o.n}.`
    };
  },

  'count-tap': (p) => {
    const n = U.ri(p.min || 1, p.max || 10);
    const o = U.pick(OBJ);
    return {
      format: 'numpad',
      prompt: 'Count and type the number',
      say: `Count the ${o.n}, then press the number.`,
      visual: U.emojiGroup(o.e, n),
      answer: n,
      explain: `Count one at a time. There are ${n} ${o.n}.`
    };
  },

  'one-to-one': (p) => {
    const n = U.ri(2, p.max || 6);
    const a = U.pick(OBJ);
    let b = U.pick(OBJ); while (b === a) b = U.pick(OBJ);
    const same = Math.random() < 0.5;
    const n2 = same ? n : (Math.random() < 0.5 && n > 2 ? n - 1 : n + 1);
    return {
      format: 'tap',
      prompt: 'Does every ' + a.s + ' get a ' + b.s + '?',
      say: `Look! Are there enough ${b.n}? Does every ${a.s} get one ${b.s}?`,
      visual: `<div class="two-rows"><div>${U.emojiGroup(a.e, n)}</div><div>${U.emojiGroup(b.e, n2)}</div></div>`,
      choices: U.shuffle([
        { label: 'Yes', emoji: '👍', correct: same || n2 > n },
        { label: 'No', emoji: '👎', correct: !(same || n2 > n) }
      ]),
      explain: same ? `Match them one by one — every ${a.s} gets exactly one ${b.s}!` :
        (n2 > n ? `There are even extra ${b.n}, so yes!` : `Match them up — one ${a.s} is left without a ${b.s}.`)
    };
  },

  'compare-groups': (p) => {
    const max = p.max || 10;
    let a = U.ri(1, max), b = U.ri(1, max);
    while (a === b) b = U.ri(1, max);
    const o1 = OBJ[0 + U.ri(0, 5)], o2 = OBJ[6 + U.ri(0, 5)];
    const wantMore = Math.random() < 0.5;
    return {
      format: 'tap',
      prompt: wantMore ? 'Which group has MORE?' : 'Which group has FEWER?',
      say: wantMore ? 'Tap the group that has more.' : 'Tap the group that has fewer.',
      choices: U.shuffle([
        { label: '', emoji: '', html: U.emojiGroup(o1.e, a), correct: wantMore ? a > b : a < b },
        { label: '', emoji: '', html: U.emojiGroup(o2.e, b), correct: wantMore ? b > a : b < a }
      ]),
      big: true,
      explain: `Count both groups. ${Math.max(a,b)} is more than ${Math.min(a,b)}.`
    };
  },

  'shape-id': (p) => {
    const target = U.pick(SHAPES2D.slice(0, p.count || 6));
    const others = U.pickN(SHAPES2D.filter(s => s.name !== target.name), 3);
    return {
      format: 'tap',
      prompt: 'Find the ' + target.name,
      say: `Tap the ${target.name}.`,
      choices: U.shuffle([{ html: shapeSVG(target), correct: true }].concat(others.map(s => ({ html: shapeSVG(s), correct: false })))),
      big: true,
      explain: target.sides ? `A ${target.name} has ${target.sides} sides.` : `A ${target.name} is round with no corners.`
    };
  },

  'shape-sides': () => {
    const sh = U.pick(SHAPES2D.filter(s => s.sides > 0));
    return {
      format: 'tap',
      prompt: 'How many sides?',
      say: `How many sides does this ${sh.name} have? Count the straight edges.`,
      visual: shapeSVG(sh),
      choices: U.choicesFrom(sh.sides, U.distractors(sh.sides, 3, 1, 8)),
      explain: `A ${sh.name} has ${sh.sides} sides. Trace each edge with your finger.`
    };
  },

  'pattern-next': (p) => {
    const emo = U.pickN(['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '⭐', '🌙', '🌊', '🍁'], p.symbols || 2);
    const unit = p.symbols === 3 ? [emo[0], emo[1], emo[2]] : (Math.random() < 0.5 ? [emo[0], emo[1]] : [emo[0], emo[0], emo[1]]);
    const seq = [];
    for (let i = 0; i < 3; i++) seq.push(...unit);
    const answer = unit[seq.length % unit.length];
    seq.push('❓');
    const wrong = emo.filter(e => e !== answer);
    return {
      format: 'tap',
      prompt: 'What comes next?',
      say: 'Look at the pattern. What comes next?',
      visual: `<div class="pattern-row">${seq.map(s => `<span class="pat-item${s === '❓' ? ' pat-q' : ''}">${s}</span>`).join('')}</div>`,
      choices: U.shuffle([{ label: answer, correct: true }].concat(U.pickN(wrong, Math.min(2, wrong.length)).map(w => ({ label: w, correct: false })))),
      big: true,
      explain: `The pattern repeats: ${unit.join(' ')}. So next comes ${answer}.`
    };
  },

  'decompose-10': (p) => {
    const total = p.total || U.pick([5, 6, 7, 8, 9, 10]);
    const a = U.ri(0, total);
    const o = U.pick(OBJ);
    return {
      format: 'numpad',
      prompt: `${a} + ❓ = ${total}`,
      say: `${a} plus what makes ${total}?`,
      visual: `<div class="two-rows"><div>${U.emojiGroup(o.e, a)}</div><div class="ghost-row">${U.emojiGroup('⬜', total - a)}</div></div>`,
      answer: total - a,
      explain: `Start at ${a} and count up to ${total}: you need ${total - a} more.`
    };
  },

  'trace-number': (p) => {
    const n = U.ri(p.min || 0, p.max || 9);
    return {
      format: 'trace',
      prompt: 'Trace the number ' + n,
      say: `Trace the number ${n} with your finger.`,
      traceChar: String(n),
      explain: `Follow the shape of the ${n}.`
    };
  },

  /* ---------- GRADE 1 ---------- */

  'read-number': (p) => {
    const n = U.ri(p.min || 10, p.max || 20);
    return {
      format: 'tap',
      prompt: 'Tap the number you hear',
      say: `Tap the number ${U.numberWord(n)}.`,
      audioOnly: true,
      choices: U.choicesFrom(n, U.distractors(n, 3, p.min || 10, p.max || 20)),
      explain: `${U.numberWord(n)} is written like this: ${n}.`
    };
  },

  'add-within': (p) => {
    const max = p.max || 10;
    const a = U.ri(1, max - 1), b = U.ri(1, max - a);
    const o = U.pick(OBJ);
    const showObjects = max <= 20;
    // Sometimes a word problem — BC curriculum stresses contextual math
    if (Math.random() < 0.4) {
      const [k1, k2] = U.pickN(KIDS, 2);
      const story = `${k1} has ${a} ${a === 1 ? o.s : o.n}. ${k2} gives ${k1} ${b} more. How many ${o.n} does ${k1} have now?`;
      return {
        format: 'numpad',
        prompt: story,
        say: story,
        visual: showObjects ? `<div class="hint-emoji">${o.e}</div>` : '',
        answer: a + b,
        explain: `${a} plus ${b} more makes ${a + b}.`
      };
    }
    return {
      format: 'numpad',
      prompt: `${a} + ${b} = ?`,
      say: `What is ${a} plus ${b}?`,
      visual: showObjects ? `<div class="add-visual">${U.emojiGroup(o.e, a)}<span class="op-sign">+</span>${U.emojiGroup(o.e, b)}</div>` : '',
      answer: a + b,
      explain: `Start at ${a}, then count up ${b} more: ${a + b}.`
    };
  },

  'sub-within': (p) => {
    const max = p.max || 10;
    const a = U.ri(2, max), b = U.ri(1, a - 1);
    const o = U.pick(OBJ);
    if (Math.random() < 0.4) {
      const k1 = U.pick(KIDS);
      const story = `${k1} has ${a} ${o.n}. ${k1} gives away ${b}. How many ${o.n} are left?`;
      return {
        format: 'numpad',
        prompt: story,
        say: story,
        visual: max <= 20 ? `<div class="hint-emoji">${o.e}</div>` : '',
        answer: a - b,
        explain: `${a} take away ${b} leaves ${a - b}.`
      };
    }
    return {
      format: 'numpad',
      prompt: `${a} − ${b} = ?`,
      say: `What is ${a} take away ${b}?`,
      visual: max <= 20 ? `<div class="add-visual"><div class="emoji-group">${Array.from({ length: a }, (_, i) =>
        `<span class="eg-item${i >= a - b ? ' crossed' : ''}">${o.e}</span>`).join('')}</div></div>` : '',
      answer: a - b,
      explain: `Start with ${a} and take away ${b}. Count what is left: ${a - b}.`
    };
  },

  'equality-balance': (p) => {
    const max = p.max || 10;
    const a = U.ri(1, max - 1), b = U.ri(1, max - a);
    const sum = a + b;
    const equal = Math.random() < 0.5;
    const c = equal ? sum : sum + U.pick([-2, -1, 1, 2]);
    return {
      format: 'tap',
      prompt: `Is ${a} + ${b} = ${c} true?`,
      say: `Is ${a} plus ${b} the same as ${c}? True or false?`,
      visual: `<div class="balance">⚖️</div>`,
      choices: U.shuffle([
        { label: 'True', emoji: '✅', correct: c === sum },
        { label: 'False', emoji: '❌', correct: c !== sum }
      ]),
      explain: `${a} plus ${b} makes ${sum}. ${c === sum ? 'Both sides match — it is true!' : `${sum} is not ${c}, so it is false.`}`
    };
  },

  'missing-number-eq': (p) => {
    const max = p.max || 20;
    const a = U.ri(1, max - 1), b = U.ri(1, max - a);
    const style = U.ri(0, 1);
    return style === 0 ? {
      format: 'numpad',
      prompt: `${a} + ❓ = ${a + b}`,
      say: `${a} plus what equals ${a + b}?`,
      answer: b,
      explain: `Count up from ${a} to ${a + b}: that is ${b} more.`
    } : {
      format: 'numpad',
      prompt: `❓ − ${a} = ${b}`,
      say: `What number minus ${a} equals ${b}?`,
      answer: a + b,
      explain: `Add back: ${b} plus ${a} is ${a + b}.`
    };
  },

  'numline-whole': (p) => {
    const min = p.min || 0, max = p.max || 20;
    const answer = U.ri(min + 1, max - 1);
    return {
      format: 'numberline', min, max, step: 1, answer,
      prompt: `Slide the arrow to ${answer}`,
      say: `Slide the arrow along the number line to the number ${answer}.`,
      explain: `Start at ${min} and count on: ${answer} is ${answer - min} steps to the right.`
    };
  },

  'numline-integer': () => {
    const answer = U.pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    return {
      format: 'numberline', min: -10, max: 10, step: 1, answer,
      prompt: `Slide the arrow to ${answer}`,
      say: `Slide the arrow to ${answer < 0 ? 'negative ' + (-answer) : answer}.`,
      explain: `${answer} is ${Math.abs(answer)} step${Math.abs(answer) === 1 ? '' : 's'} to the ${answer < 0 ? 'left' : 'right'} of zero.`
    };
  },

  'measure-compare': () => {
    const pairs = [
      { a: { e: '🦒', n: 'giraffe' }, b: { e: '🐰', n: 'rabbit' }, prop: 'taller', ans: 'a' },
      { a: { e: '🚂', n: 'train' }, b: { e: '🚲', n: 'bike' }, prop: 'longer', ans: 'a' },
      { a: { e: '🐘', n: 'elephant' }, b: { e: '🐭', n: 'mouse' }, prop: 'heavier', ans: 'a' },
      { a: { e: '🪶', n: 'feather' }, b: { e: '🪨', n: 'rock' }, prop: 'lighter', ans: 'a' },
      { a: { e: '✏️', n: 'pencil' }, b: { e: '🚌', n: 'bus' }, prop: 'shorter', ans: 'a' },
      { a: { e: '🐜', n: 'ant' }, b: { e: '🐎', n: 'horse' }, prop: 'smaller', ans: 'a' }
    ];
    const q = U.pick(pairs);
    const flip = Math.random() < 0.5;
    const first = flip ? q.b : q.a, second = flip ? q.a : q.b;
    return {
      format: 'tap',
      prompt: `Which is ${q.prop}?`,
      say: `Tap the one that is ${q.prop}. The ${first.n}, or the ${second.n}?`,
      choices: U.shuffle([
        { label: q.a.n, emoji: q.a.e, correct: true },
        { label: q.b.n, emoji: q.b.e, correct: false }
      ]),
      big: true,
      explain: `The ${q.a.n} is ${q.prop} than the ${q.b.n}.`
    };
  },

  'build-pattern': () => {
    const emo = U.pickN(['🔴', '🔵', '🟡', '🟢', '⭐', '🌙'], 2);
    const unit = Math.random() < 0.5 ? [emo[0], emo[1]] : [emo[0], emo[0], emo[1]];
    const seq = [];
    for (let i = 0; i < 2; i++) seq.push(...unit);
    const next = [];
    for (let i = 0; i < unit.length; i++) next.push(unit[(seq.length + i) % unit.length]);
    return {
      format: 'sequence',
      prompt: 'Continue the pattern — put the tiles in order',
      say: 'Continue the pattern! Tap the tiles in the right order.',
      visual: `<div class="pattern-row">${seq.map(s => `<span class="pat-item">${s}</span>`).join('')}<span class="pat-item pat-q">❓❓${unit.length > 2 ? '❓' : ''}</span></div>`,
      sequence: next,
      explain: `The repeating part is ${unit.join(' ')}.`
    };
  },

  /* ---------- GRADE 2 ---------- */

  'place-value': (p) => {
    const max = p.max || 99;
    const n = U.ri(10, max);
    const digits = String(n).split('').map(Number);
    const places = ['ones', 'tens', 'hundreds', 'thousands'];
    const pos = U.ri(0, digits.length - 1);
    const place = places[digits.length - 1 - pos];
    return {
      format: 'tap',
      prompt: `In ${n}, which digit is in the ${place} place?`,
      say: `Look at the number ${n}. Which digit is in the ${place} place?`,
      visual: `<div class="big-number">${n}</div>`,
      choices: U.choicesFrom(digits[pos], U.pickN([...new Set(digits.filter((d, i) => i !== pos).concat(U.distractors(digits[pos], 3, 0, 9)))].filter(d => d !== digits[pos]), 3)),
      explain: `Reading from the right: ones, tens, hundreds. The ${place} digit of ${n} is ${digits[pos]}.`
    };
  },

  'skip-count': (p) => {
    const step = U.pick(p.steps || [2, 5, 10]);
    const start = step * U.ri(1, 4);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const answer = start + step * 4;
    return {
      format: 'numpad',
      prompt: seq.join(', ') + ', ❓',
      say: `Count by ${step}s. ${seq.join(', ')}... what comes next?`,
      answer,
      explain: `Each number goes up by ${step}. ${seq[3]} plus ${step} is ${answer}.`
    };
  },

  'even-odd': (p) => {
    const items = [];
    const used = new Set();
    while (items.length < 4) {
      const n = U.ri(1, p.max || 30);
      if (used.has(n)) continue;
      used.add(n);
      items.push({ label: String(n), bin: n % 2 === 0 ? 'even' : 'odd' });
    }
    return {
      format: 'sort',
      prompt: 'Sort the numbers: even or odd?',
      say: 'Drag each number into the right box. Even numbers can be split into two equal teams.',
      bins: [{ id: 'even', label: 'Even', emoji: '👯' }, { id: 'odd', label: 'Odd', emoji: '🕺' }],
      items: U.shuffle(items),
      explain: 'Even numbers end in 0, 2, 4, 6, or 8. Odd numbers end in 1, 3, 5, 7, or 9.'
    };
  },

  'read-bargraph': () => {
    const cats = U.pickN([
      { label: 'cats', emoji: '🐱' }, { label: 'dogs', emoji: '🐶' }, { label: 'fish', emoji: '🐟' },
      { label: 'birds', emoji: '🐦' }, { label: 'rabbits', emoji: '🐰' }
    ], 3);
    const data = cats.map(c => ({ ...c, value: U.ri(2, 9) }));
    const style = U.ri(0, 2);
    if (style === 0) {
      const t = U.pick(data);
      return {
        format: 'numpad',
        prompt: `How many ${t.label}?`,
        say: `Look at the graph. How many ${t.label} are there?`,
        visual: U.barChartSVG(data),
        answer: t.value,
        explain: `Find the ${t.label} bar and read the number on top: ${t.value}.`
      };
    }
    const most = style === 1;
    const target = data.reduce((a, b) => (most ? (b.value > a.value ? b : a) : (b.value < a.value ? b : a)));
    return {
      format: 'tap',
      prompt: most ? 'Which has the MOST?' : 'Which has the FEWEST?',
      say: `Look at the graph. Which pet has the ${most ? 'most' : 'fewest'}?`,
      visual: U.barChartSVG(data),
      choices: U.shuffle(data.map(d => ({ label: d.label, emoji: d.emoji, correct: d === target }))),
      explain: `The ${most ? 'tallest' : 'shortest'} bar is ${target.label} with ${target.value}.`
    };
  },

  'compare-numbers': (p) => {
    const max = p.max || 100;
    let a = U.ri(p.min || 1, max), b = U.ri(p.min || 1, max);
    while (a === b) b = U.ri(p.min || 1, max);
    return {
      format: 'tap',
      prompt: `Which sign fits? ${a} ❓ ${b}`,
      say: `Which is true? ${a} is greater than, or less than, ${b}?`,
      choices: U.shuffle([
        { label: `${a} > ${b}`, correct: a > b },
        { label: `${a} < ${b}`, correct: a < b }
      ]),
      explain: `${Math.max(a, b)} is the bigger number. The open mouth of the sign always eats the bigger number.`
    };
  },

  'money-count': (p) => {
    const dollars = !!p.dollars;
    const pool = dollars ? COINS : COINS.filter(c => c.v <= 25);
    let coins, total, guard = 0;
    do {
      const n = U.ri(2, p.maxCoins || 5);
      coins = Array.from({ length: n }, () => U.pick(pool));
      total = coins.reduce((s, c) => s + c.v, 0);
    } while (!dollars && total > 100 && guard++ < 30);
    const answer = dollars ? U.round(total / 100, 2) : total;
    return {
      format: 'numpad',
      decimal: dollars,
      prompt: dollars ? 'How much money is here? (in dollars)' : 'How many cents altogether?',
      say: dollars ? 'Add up the money. How many dollars?' : 'Add up the coins. How many cents?',
      visual: coinsHTML(coins),
      answer,
      tolerance: dollars ? 0.005 : 0.001,
      explain: `Add each coin: ${coins.map(c => c.label).join(' + ')} = ${dollars ? '$' + answer.toFixed(2) : total + '¢'}.`
    };
  },

  'money-change': () => {
    const price = U.ri(1, 19) * 5;                 // 5¢ .. 95¢, tidy amounts
    const paid = price <= 95 ? 100 : 200;
    const change = paid - price;
    const o = U.pick(OBJ);
    const story = `${U.pick(KIDS)} buys a ${o.s} for ${price}¢ and pays with ${paid === 100 ? 'a $1 coin (100¢)' : 'a $2 coin (200¢)'}. How much change should come back, in cents?`;
    return {
      format: 'numpad',
      prompt: story,
      say: story,
      visual: `<div class="hint-emoji">${o.e}</div>`,
      answer: change,
      explain: `Take the price from what was paid: ${paid}¢ − ${price}¢ = ${change}¢.`
    };
  },

  'elapsed-time': () => {
    let startH, startM, dur, endMinTotal, guard = 0;
    do {
      startH = U.ri(1, 9);
      startM = U.pick([0, 15, 30, 45]);
      dur = U.pick([15, 30, 45, 60, 90, 120]);
      endMinTotal = startH * 60 + startM + dur;
    } while (endMinTotal > 12 * 60 && guard++ < 30);
    const endH = Math.floor(endMinTotal / 60), endM = endMinTotal % 60;
    const fmt = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
    const activity = U.pick(['soccer practice', 'the movie', 'the party', 'reading time', 'the bus ride', 'swimming']);
    return {
      format: 'numpad',
      prompt: `${activity[0].toUpperCase() + activity.slice(1)} starts at ${fmt(startH, startM)} and ends at ${fmt(endH, endM)}. How many minutes long is it?`,
      say: `${activity} starts at ${startH} ${startM === 0 ? "o'clock" : startM} and ends at ${endH} ${endM === 0 ? "o'clock" : endM}. How many minutes is that?`,
      visual: U.clockSVG(startH, startM),
      answer: dur,
      explain: `From ${fmt(startH, startM)} to ${fmt(endH, endM)} is ${dur} minutes${dur >= 60 ? ` (${dur / 60} hour${dur > 60 ? 's' : ''})` : ''}.`
    };
  },

  /* ---------- GRADE 3 ---------- */

  'mult-groups': (p) => {
    const g = U.ri(2, p.max || 5), per = U.ri(2, p.max || 5);
    const o = U.pick(OBJ);
    return {
      format: 'numpad',
      prompt: `${g} groups of ${per} = ?`,
      say: `There are ${g} groups with ${per} ${o.n} in each. How many altogether? That is ${g} times ${per}.`,
      visual: `<div class="groups-visual">${Array.from({ length: g }, () => `<div class="group-box">${U.emojiGroup(o.e, per)}</div>`).join('')}</div>`,
      answer: g * per,
      explain: `Count by ${per}s, ${g} times: ${Array.from({ length: g }, (_, i) => per * (i + 1)).join(', ')}. So ${g} × ${per} = ${g * per}.`
    };
  },

  'div-sharing': (p) => {
    const per = U.ri(2, p.max || 5), g = U.ri(2, p.max || 5);
    const total = per * g;
    const o = U.pick(OBJ);
    return {
      format: 'numpad',
      prompt: `${total} ÷ ${g} = ?`,
      say: `Share ${total} ${o.n} fairly between ${g} friends. How many does each friend get?`,
      visual: `<div class="add-visual">${U.emojiGroup(o.e, Math.min(total, 24))}<span class="op-sign">→</span>${U.emojiGroup('🙋', g)}</div>`,
      answer: per,
      explain: `Deal them out one at a time to ${g} friends. Each gets ${per}, because ${g} × ${per} = ${total}.`
    };
  },

  'fraction-identify': (p) => {
    const den = U.pick(p.dens || [2, 3, 4, 6, 8]);
    const num = U.ri(1, den - 1);
    return {
      format: 'tap',
      prompt: 'What fraction is coloured?',
      say: `Look at the shape. What fraction is coloured orange?`,
      visual: U.fractionSVG(num, den, U.pick(['circle', 'bar'])),
      choices: U.choicesFrom(`${num}/${den}`, [
        `${den - num}/${den}`,
        `${num}/${den + (den > 2 ? U.pick([-1, 1]) : 1)}`,
        `${Math.min(num + 1, den)}/${den}`
      ].filter((v, i, a) => v !== `${num}/${den}` && a.indexOf(v) === i).slice(0, 3)),
      explain: `The shape has ${den} equal parts and ${num} are coloured, so the fraction is ${num} out of ${den}.`
    };
  },

  'time-read': (p) => {
    const h = U.ri(1, 12);
    const m = p.precision === 1 ? U.ri(0, 59) : U.pick(p.precision === 5 ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] : [0, 30]);
    const fmt = (hh, mm) => `${hh}:${String(mm).padStart(2, '0')}`;
    const wrongs = [fmt(h, (m + 15) % 60), fmt(h % 12 + 1, m), fmt(m === 0 ? h : (h % 12) + 1, (m + 30) % 60)]
      .filter((v, i, a) => v !== fmt(h, m) && a.indexOf(v) === i);
    return {
      format: 'tap',
      prompt: 'What time is it?',
      say: 'Read the clock. What time does it show?',
      visual: U.clockSVG(h, m),
      choices: U.choicesFrom(fmt(h, m), wrongs.slice(0, 3)),
      explain: `The short hand shows the hour (${h}) and the long hand shows the minutes (${m}). It is ${fmt(h, m)}.`
    };
  },

  'perimeter': (p) => {
    const w = U.ri(2, p.max || 9), h = U.ri(2, p.max || 9);
    return {
      format: 'numpad',
      prompt: 'What is the perimeter?',
      say: `A rectangle is ${w} units wide and ${h} units tall. The perimeter is the distance all the way around. What is it?`,
      visual: `<svg viewBox="0 0 160 120" class="rect-svg"><rect x="20" y="20" width="120" height="80" fill="#d9f3f0" stroke="#4ecdc4" stroke-width="3" rx="6"/>
        <text x="80" y="14" text-anchor="middle" font-size="14" font-weight="700" fill="#3d3554">${w}</text>
        <text x="10" y="65" text-anchor="middle" font-size="14" font-weight="700" fill="#3d3554">${h}</text></svg>`,
      answer: 2 * (w + h),
      explain: `Add all four sides: ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}.`
    };
  },

  'expanded-form': (p) => {
    const n = U.ri(p.min || 100, p.max || 999);
    const d = String(n).split('').map(Number);
    const parts = d.map((digit, i) => digit * Math.pow(10, d.length - 1 - i)).filter(x => x > 0);
    return {
      format: 'tap',
      prompt: `Which shows ${n}?`,
      say: `Which sum builds the number ${n}?`,
      choices: U.choicesFrom(parts.join(' + '), [
        parts.map(x => x * 10).join(' + '),
        parts.slice().reverse().map((x, i) => x).join(' + ') === parts.join(' + ') ? parts.map(x => x + 10).join(' + ') : parts.slice().reverse().join(' + '),
        parts.map((x, i) => i === 0 ? x / 10 * 10 + 10 : x).join(' + ')
      ].filter((v, i, a) => v !== parts.join(' + ') && a.indexOf(v) === i).slice(0, 3)),
      explain: `${n} is made of ${parts.join(' plus ')}.`
    };
  },

  /* ---------- GRADE 4 ---------- */

  'mult-facts': (p) => {
    const a = U.ri(2, p.max || 10), b = U.ri(2, p.max || 10);
    if (Math.random() < 0.35) {
      const o = U.pick(OBJ);
      const story = `A shop sells ${o.n} in bags of ${b}. ${U.pick(KIDS)} buys ${a} bags. How many ${o.n} is that?`;
      return {
        format: 'numpad',
        prompt: story,
        say: story,
        answer: a * b,
        explain: `${a} bags of ${b}: ${a} × ${b} = ${a * b}.`
      };
    }
    return {
      format: 'numpad',
      prompt: `${a} × ${b} = ?`,
      say: `What is ${a} times ${b}?`,
      answer: a * b,
      explain: `Think of ${a} groups of ${b}. ${a} × ${b} = ${a * b}.`
    };
  },

  'div-facts': (p) => {
    const b = U.ri(2, p.max || 10), q = U.ri(2, p.max || 10);
    if (Math.random() < 0.35) {
      const o = U.pick(OBJ);
      const story = `${b * q} ${o.n} are packed equally into ${b} boxes. How many ${o.n} go in each box?`;
      return {
        format: 'numpad',
        prompt: story,
        say: story,
        answer: q,
        explain: `${b * q} shared into ${b} boxes: ${b * q} ÷ ${b} = ${q} each.`
      };
    }
    return {
      format: 'numpad',
      prompt: `${b * q} ÷ ${b} = ?`,
      say: `What is ${b * q} divided by ${b}?`,
      answer: q,
      explain: `Ask: ${b} times what makes ${b * q}? It is ${q}.`
    };
  },

  'decimal-model': (p) => {
    const tenths = p.hundredths ? null : U.ri(1, 9);
    const n = p.hundredths ? U.ri(1, 99) : tenths * 10;
    const val = n / 100;
    const label = p.hundredths ? val.toFixed(2) : (n / 100).toFixed(1);
    const cells = Array.from({ length: 100 }, (_, i) => `<div class="dec-cell${i < n ? ' filled' : ''}"></div>`).join('');
    const wrongs = p.hundredths
      ? [((n + 10) % 100 / 100).toFixed(2), (n / 10).toFixed(2), ((100 - n) / 100).toFixed(2)]
      : [((tenths % 9) + 1 !== tenths ? ((tenths % 9 + 1) / 10).toFixed(1) : ((tenths + 2) % 10 / 10).toFixed(1)), (tenths / 100).toFixed(2), ((10 - tenths) / 10).toFixed(1)];
    return {
      format: 'tap',
      prompt: 'How much is shaded?',
      say: 'The whole square is 1. How much of it is shaded? Choose the decimal.',
      visual: `<div class="dec-grid">${cells}</div>`,
      choices: U.choicesFrom(label, [...new Set(wrongs)].filter(w => w !== label).slice(0, 3)),
      explain: `${n} out of 100 squares are shaded. That is ${label}.`
    };
  },

  'area-rect': (p) => {
    const w = U.ri(2, p.max || 9), h = U.ri(2, p.max || 9);
    return {
      format: 'numpad',
      prompt: 'What is the area? (square units)',
      say: `A rectangle is ${w} units wide and ${h} units tall. How many unit squares cover it? Multiply to find the area.`,
      visual: `<svg viewBox="0 0 ${w * 20 + 8} ${h * 20 + 8}" class="rect-svg" style="max-width:${w * 24}px">${
        Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) =>
          `<rect x="${c * 20 + 4}" y="${r * 20 + 4}" width="18" height="18" fill="#ffe8b3" stroke="#e5b45a" rx="3"/>`).join('')).join('')
      }</svg>`,
      answer: w * h,
      explain: `${h} rows of ${w} squares: ${w} × ${h} = ${w * h} square units.`
    };
  },

  'symmetry': () => {
    const symmetric = [
      { e: '🦋', n: 'butterfly' }, { e: '⭐', n: 'star' }, { e: '❤️', n: 'heart' }, { e: '⬜', n: 'square' }, { e: '🔷', n: 'diamond' }
    ];
    const not = [
      { e: '🌙', n: 'crescent moon tilted' }, { e: '🪃', n: 'boomerang' }, { e: '🇨🇦', n: 'flag' }, { e: '👞', n: 'shoe' }
    ];
    const s = U.pick(symmetric), o = U.pick(not);
    return {
      format: 'tap',
      prompt: 'Which shape has a line of symmetry?',
      say: 'Which picture could fold in half so both sides match exactly?',
      choices: U.shuffle([
        { label: '', emoji: s.e, correct: true },
        { label: '', emoji: o.e, correct: false }
      ]),
      big: true,
      explain: `The ${s.n} folds perfectly in half — both sides mirror each other.`
    };
  },

  'data-table': () => {
    const kids = U.pickN(['Ava', 'Ben', 'Cleo', 'Dev', 'Emi', 'Finn'], 4);
    const vals = kids.map(() => U.ri(3, 20));
    const thing = U.pick(['books read', 'goals scored', 'laps swum', 'stickers earned']);
    const style = U.ri(0, 2);
    let q, ans, explain;
    if (style === 0) {
      const i = U.ri(0, 3);
      q = `How many ${thing} does ${kids[i]} have?`; ans = vals[i];
      explain = `Find ${kids[i]}'s row: ${vals[i]}.`;
    } else if (style === 1) {
      const maxI = vals.indexOf(Math.max(...vals));
      return {
        format: 'tap', prompt: `Who has the most ${thing}?`, say: `Read the table. Who has the most ${thing}?`,
        visual: tableHTML(kids, vals, thing),
        choices: U.shuffle(kids.map((k, i) => ({ label: k, correct: i === maxI }))),
        explain: `The biggest number is ${Math.max(...vals)} — that is ${kids[maxI]}.`
      };
    } else {
      q = `How many ${thing} do ${kids[0]} and ${kids[1]} have together?`;
      ans = vals[0] + vals[1];
      explain = `Add ${vals[0]} + ${vals[1]} = ${ans}.`;
    }
    return {
      format: 'numpad', prompt: q, say: 'Read the table. ' + q,
      visual: tableHTML(kids, vals, thing),
      answer: ans, explain
    };
  },

  'round-number': (p) => {
    const to = U.pick(p.to || [10, 100]);
    const n = U.ri(p.min || 11, p.max || 989);
    const ans = Math.round(n / to) * to;
    return {
      format: 'tap',
      prompt: `Round ${n} to the nearest ${to}`,
      say: `Round ${n} to the nearest ${to}.`,
      choices: U.choicesFrom(ans, [...new Set([ans + to, ans - to, ans + to * 2])].filter(x => x !== ans && x >= 0).slice(0, 3)),
      explain: `${n} is closer to ${ans} than to ${ans + (n >= ans ? to : -to)}.`
    };
  },

  /* ---------- GRADE 5 ---------- */

  'multi-digit-ops': (p) => {
    const kind = U.pick(p.kinds || ['add', 'sub', 'mult']);
    if (kind === 'add') {
      const a = U.ri(120, 900), b = U.ri(120, 900);
      return { format: 'numpad', prompt: `${a} + ${b} = ?`, say: `What is ${a} plus ${b}?`, answer: a + b, explain: `Add the ones, then tens, then hundreds: ${a + b}.` };
    }
    if (kind === 'sub') {
      const a = U.ri(300, 999), b = U.ri(100, a - 50);
      return { format: 'numpad', prompt: `${a} − ${b} = ?`, say: `What is ${a} minus ${b}?`, answer: a - b, explain: `Subtract place by place, borrowing when needed: ${a - b}.` };
    }
    const a = U.ri(12, 99), b = U.ri(3, 9);
    return { format: 'numpad', prompt: `${a} × ${b} = ?`, say: `What is ${a} times ${b}?`, answer: a * b, explain: `Break it up: ${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}, plus ${a % 10} × ${b} = ${(a % 10) * b}. Total ${a * b}.` };
  },

  'equiv-fractions': () => {
    const base = U.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]]);
    const mult = U.ri(2, 4);
    const [n, d] = base;
    const ans = `${n * mult}/${d * mult}`;
    const wrongs = [`${n * mult + 1}/${d * mult}`, `${n * mult}/${d * mult + d}`, `${n + mult}/${d + mult}`];
    return {
      format: 'tap',
      prompt: `Which fraction equals ${n}/${d}?`,
      say: `Which fraction is the same amount as ${n} over ${d}?`,
      visual: U.fractionSVG(n, d, 'bar'),
      choices: U.choicesFrom(ans, [...new Set(wrongs)].filter(w => w !== ans).slice(0, 3)),
      explain: `Multiply top and bottom by ${mult}: ${n}/${d} = ${ans}. Same amount, smaller pieces.`
    };
  },

  'fraction-of-set': () => {
    const o1 = U.pick(OBJ); let o2 = U.pick(OBJ); while (o2 === o1) o2 = U.pick(OBJ);
    if (Math.random() < 0.5) {
      // What fraction of the group are o1?
      const total = U.ri(4, 8), k = U.ri(1, total - 1);
      const items = U.shuffle(Array.from({ length: total }, (_, i) => (i < k ? o1 : o2)));
      const ans = `${k}/${total}`;
      const wrongs = [`${total - k}/${total}`, `${k}/${total + 1}`, `${Math.min(k + 1, total)}/${total}`]
        .filter((v, i, a) => v !== ans && a.indexOf(v) === i).slice(0, 3);
      return {
        format: 'tap',
        prompt: `What fraction of the group are ${o1.n}?`,
        say: `What fraction of the whole group are ${o1.n}?`,
        visual: `<div class="emoji-group">${items.map(o => `<span class="eg-item">${o.e}</span>`).join('')}</div>`,
        choices: U.choicesFrom(ans, wrongs),
        explain: `${k} of the ${total} are ${o1.n}, so ${k} out of ${total} — that is ${ans}.`
      };
    }
    // Find a unit fraction of a quantity
    const d = U.pick([2, 3, 4, 5]);
    const per = U.ri(2, 6), N = d * per;
    const word = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth' }[d];
    return {
      format: 'numpad',
      prompt: `What is 1/${d} of ${N}?`,
      say: `What is one ${word} of ${N}?`,
      visual: U.emojiGroup(o1.e, N),
      answer: per,
      explain: `Split ${N} into ${d} equal groups. Each group has ${per}, so 1/${d} of ${N} is ${per}.`
    };
  },

  'temperature': () => {
    const temp = U.pick([-15, -10, -5, 0, 5, 10, 15, 20, 25, 30]);
    const wrongs = U.shuffle([temp + 5, temp - 5, temp + 10, -temp || 5])
      .filter((v, i, a) => v !== temp && a.indexOf(v) === i && v >= -20 && v <= 40).slice(0, 3).map(v => v + '°');
    return {
      format: 'tap',
      prompt: 'What temperature does it show?',
      say: 'Read the thermometer. What temperature does it show, in degrees?',
      visual: U.thermometerSVG(temp, -20, 40),
      choices: U.choicesFrom(temp + '°', wrongs),
      explain: `The red line reaches ${temp} degrees${temp < 0 ? ', which is below zero' : ''}.`
    };
  },

  'decimal-compare': (p) => {
    const places = p.places || 3;
    const a = U.round(Math.random() * 9 + 0.1, places);
    let b = U.round(a + (Math.random() < 0.5 ? -1 : 1) * Math.random() * 0.5, places);
    if (b === a || b <= 0) b = U.round(a + 0.111, places);
    return {
      format: 'tap',
      prompt: 'Which number is GREATER?',
      say: `Which is greater: ${a}, or ${b}?`,
      choices: U.shuffle([
        { label: String(a), correct: a > b },
        { label: String(b), correct: b > a }
      ]),
      big: true,
      explain: `Compare digit by digit from the left. ${Math.max(a, b)} is greater.`
    };
  },

  'one-step-equation': (p) => {
    const x = U.ri(2, p.max || 12);
    const kind = U.pick(['add', 'sub', 'mult']);
    if (kind === 'add') {
      const b = U.ri(2, 20);
      return { format: 'numpad', prompt: `x + ${b} = ${x + b}.  x = ?`, say: `x plus ${b} equals ${x + b}. What is x?`, answer: x, explain: `Undo the +${b}: subtract ${b} from ${x + b} to get x = ${x}.` };
    }
    if (kind === 'sub') {
      const b = U.ri(1, x - 1 || 1);
      return { format: 'numpad', prompt: `x − ${b} = ${x - b}.  x = ?`, say: `x minus ${b} equals ${x - b}. What is x?`, answer: x, explain: `Undo the −${b}: add ${b} to ${x - b} to get x = ${x}.` };
    }
    const b = U.ri(2, 9);
    return { format: 'numpad', prompt: `${b}x = ${b * x}.  x = ?`, say: `${b} times x equals ${b * x}. What is x?`, answer: x, explain: `Undo the ×${b}: divide ${b * x} by ${b} to get x = ${x}.` };
  },

  'solids-id': () => {
    const target = U.pick(SOLIDS);
    const style = U.ri(0, 1);
    if (style === 0) {
      return {
        format: 'tap',
        prompt: `Which is shaped like a ${target.name}?`,
        say: `Tap the object shaped like a ${target.name}.`,
        choices: U.shuffle([{ emoji: target.e, label: '', correct: true }].concat(U.pickN(SOLIDS.filter(s => s !== target), 3).map(s => ({ emoji: s.e, label: '', correct: false })))),
        big: true,
        explain: `A ${target.name} looks like this: ${target.e}.`
      };
    }
    return {
      format: 'tap',
      prompt: `Which net folds into a ${target.name === 'sphere' ? 'cube' : target.name}?`,
      say: `A net is a flat shape that folds into a solid. Which net makes a ${target.name === 'sphere' ? 'cube' : target.name}?`,
      choices: (() => {
        const t = target.name === 'sphere' ? SOLIDS[0] : target;
        return U.shuffle([{ label: t.net, correct: true }].concat(U.pickN(SOLIDS.filter(s => s !== t && s.name !== 'sphere'), 2).map(s => ({ label: s.net, correct: false }))));
      })(),
      explain: `A ${target.name === 'sphere' ? 'cube' : target.name} unfolds into ${target.name === 'sphere' ? SOLIDS[0].net : target.net}.`
    };
  },

  'probability-intro': () => {
    const colors = [
      { color: '#ff7a59', emoji: '🔴', name: 'red' },
      { color: '#5fb0f2', emoji: '🔵', name: 'blue' },
      { color: '#ffd34d', emoji: '🟡', name: 'yellow' }
    ];
    const counts = U.shuffle([U.ri(3, 5), U.ri(1, 2), U.ri(1, 2)]);
    const sections = colors.map((c, i) => ({ ...c, count: counts[i] }));
    const style = U.ri(0, 1);
    const maxSec = sections.reduce((a, b) => b.count > a.count ? b : a);
    if (style === 0) {
      return {
        format: 'tap',
        prompt: 'Which colour is the spinner MOST likely to land on?',
        say: 'Look at the spinner. Which colour is it most likely to land on?',
        visual: U.spinnerSVG(sections),
        choices: U.shuffle(sections.map(s => ({ label: s.name, emoji: s.emoji, correct: s === maxSec }))),
        explain: `${maxSec.name} has the most sections (${maxSec.count}), so it is most likely.`
      };
    }
    const total = sections.reduce((s, x) => s + x.count, 0);
    const t = U.pick(sections);
    return {
      format: 'tap',
      prompt: `What is the chance of landing on ${t.name}?`,
      say: `The spinner has ${total} equal sections. What is the chance of landing on ${t.name}?`,
      visual: U.spinnerSVG(sections),
      choices: U.choicesFrom(`${t.count} out of ${total}`, sections.filter(s => s !== t).map(s => `${s.count} out of ${total}`).concat([`${total} out of ${t.count}`]).filter((v, i, a) => a.indexOf(v) === i && v !== `${t.count} out of ${total}`).slice(0, 3)),
      explain: `${t.count} of the ${total} sections are ${t.name}: ${t.count} out of ${total}.`
    };
  },

  /* ---------- GRADE 6 ---------- */

  'percent-basic': (p) => {
    const style = U.ri(0, 1);
    if (style === 0) {
      const pct = U.pick([10, 20, 25, 50, 75]);
      const base = U.pick([20, 40, 60, 80, 100, 200]);
      return {
        format: 'numpad',
        prompt: `${pct}% of ${base} = ?`,
        say: `What is ${pct} percent of ${base}?`,
        answer: base * pct / 100,
        explain: `${pct}% means ${pct} out of every 100. ${pct}% of ${base} is ${base * pct / 100}.`
      };
    }
    const map = [
      { pct: '50%', frac: '1/2', dec: '0.5' }, { pct: '25%', frac: '1/4', dec: '0.25' },
      { pct: '75%', frac: '3/4', dec: '0.75' }, { pct: '10%', frac: '1/10', dec: '0.1' }, { pct: '20%', frac: '1/5', dec: '0.2' }
    ];
    const m = U.pick(map);
    const toFrac = Math.random() < 0.5;
    const answer = toFrac ? m.frac : m.dec;
    const wrongs = map.filter(x => x !== m).map(x => toFrac ? x.frac : x.dec);
    return {
      format: 'tap',
      prompt: `${m.pct} = ?`,
      say: `Which ${toFrac ? 'fraction' : 'decimal'} equals ${m.pct}?`,
      choices: U.choicesFrom(answer, U.pickN(wrongs, 3)),
      explain: `${m.pct} means ${m.pct.replace('%', '')} out of 100 — that is ${m.frac} or ${m.dec}.`
    };
  },

  'integers-intro': () => {
    const style = U.ri(0, 1);
    if (style === 0) {
      let a = U.ri(-9, 9), b = U.ri(-9, 9);
      while (a === b) b = U.ri(-9, 9);
      return {
        format: 'tap',
        prompt: 'Which number is GREATER?',
        say: `Which is greater: ${a < 0 ? 'negative ' + (-a) : a}, or ${b < 0 ? 'negative ' + (-b) : b}?`,
        visual: U.numberLineSVG(-10, 10, Math.max(a, b)),
        choices: U.shuffle([{ label: String(a), correct: a > b }, { label: String(b), correct: b > a }]),
        big: true,
        explain: `On the number line, numbers get bigger to the right. ${Math.max(a, b)} is further right.`
      };
    }
    const situations = [
      { s: '5 degrees below zero', a: -5 }, { s: 'a gain of 7 points', a: 7 },
      { s: '3 floors underground', a: -3 }, { s: '10 metres above sea level', a: 10 },
      { s: 'losing 4 dollars', a: -4 }, { s: '8 degrees warmer', a: 8 }
    ];
    const sit = U.pick(situations);
    return {
      format: 'tap',
      prompt: `Which integer shows: ${sit.s}?`,
      say: `Which integer shows ${sit.s}?`,
      choices: U.choicesFrom(sit.a, [-sit.a, sit.a + (sit.a > 0 ? 1 : -1), 0].filter((v, i, arr) => v !== sit.a && arr.indexOf(v) === i).slice(0, 3)),
      explain: `${sit.s} is ${sit.a < 0 ? 'below zero, so negative' : 'above zero, so positive'}: ${sit.a}.`
    };
  },

  'order-ops': (p) => {
    const a = U.ri(2, 6), b = U.ri(2, 6), c = U.ri(2, 9);
    const style = U.ri(0, 2);
    let expr, ans, explain;
    if (style === 0) { expr = `${c} + ${a} × ${b}`; ans = c + a * b; explain = `Multiply first: ${a} × ${b} = ${a * b}. Then ${c} + ${a * b} = ${ans}.`; }
    else if (style === 1) { expr = `(${c} + ${a}) × ${b}`; ans = (c + a) * b; explain = `Brackets first: ${c} + ${a} = ${c + a}. Then × ${b} = ${ans}.`; }
    else { expr = `${a * b + c} − ${a} × ${b}`; ans = a * b + c - a * b; explain = `Multiply first: ${a} × ${b} = ${a * b}. Then ${a * b + c} − ${a * b} = ${ans}.`; }
    return {
      format: 'numpad',
      prompt: `${expr} = ?`,
      say: `Careful — remember the order of operations! What is ${expr.replace('×', 'times').replace('−', 'minus').replace('(', 'open bracket ').replace(')', ' close bracket')}?`,
      answer: ans,
      explain
    };
  },

  'ratios': () => {
    const a = U.ri(1, 5), b = U.ri(1, 5);
    const o1 = U.pick(OBJ); let o2 = U.pick(OBJ); while (o2 === o1) o2 = U.pick(OBJ);
    const style = U.ri(0, 1);
    if (style === 0) {
      return {
        format: 'tap',
        prompt: `What is the ratio of ${o1.n} to ${o2.n}?`,
        say: `Count each kind. What is the ratio of ${o1.n} to ${o2.n}?`,
        visual: `<div class="add-visual">${U.emojiGroup(o1.e, a)}${U.emojiGroup(o2.e, b)}</div>`,
        choices: U.choicesFrom(`${a} : ${b}`, [`${b} : ${a}`, `${a + 1} : ${b}`, `${a} : ${b + 1}`].filter(v => v !== `${a} : ${b}`).slice(0, 3)),
        explain: `${a} ${o1.n} and ${b} ${o2.n} — the ratio is ${a} to ${b}, in that order.`
      };
    }
    const mult = U.ri(2, 4);
    return {
      format: 'numpad',
      prompt: `${a} : ${b}  =  ${a * mult} : ?`,
      say: `The ratio ${a} to ${b} is scaled up. ${a} becomes ${a * mult}. What does ${b} become?`,
      answer: b * mult,
      explain: `Both sides multiply by ${mult}: ${b} × ${mult} = ${b * mult}.`
    };
  },

  'angles': () => {
    const style = U.ri(0, 1);
    if (style === 0) {
      const types = [
        { name: 'right angle (90°)', deg: 90 },
        { name: 'acute angle (less than 90°)', deg: U.ri(20, 70) },
        { name: 'obtuse angle (more than 90°)', deg: U.ri(110, 165) }
      ];
      const t = U.pick(types);
      return {
        format: 'tap',
        prompt: 'What kind of angle is this?',
        say: 'Look at the angle. Is it acute, right, or obtuse?',
        visual: U.angleSVG(t.deg),
        choices: U.shuffle(types.map(x => ({ label: x.name.split(' (')[0], correct: x === t }))),
        explain: `This angle is about ${t.deg} degrees — ${t.name}.`
      };
    }
    const deg = U.pick([30, 45, 60, 90, 120, 135, 150]);
    return {
      format: 'tap',
      prompt: 'Estimate: how many degrees?',
      say: 'Estimate the size of this angle in degrees.',
      visual: U.angleSVG(deg),
      choices: U.choicesFrom(deg + '°', [...new Set([deg + 40, Math.max(10, deg - 40), deg + 80].map(d => Math.min(175, d) + '°'))].filter(v => v !== deg + '°').slice(0, 3)),
      explain: `A right angle is 90°. This one is ${deg}°.`
    };
  },

  'line-graph': () => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const pts = labels.map(() => U.ri(2, 14));
    const thing = U.pick(['km biked', 'books sold', 'visitors', 'goals']);
    const style = U.ri(0, 1);
    if (style === 0) {
      const i = U.ri(0, 4);
      return {
        format: 'numpad',
        prompt: `How many ${thing} on ${labels[i]}?`,
        say: `Read the line graph. How many ${thing} on ${labels[i]}?`,
        visual: U.lineGraphSVG(pts, labels),
        answer: pts[i],
        explain: `Find ${labels[i]} on the bottom and read up to the dot: ${pts[i]}.`
      };
    }
    const maxI = pts.indexOf(Math.max(...pts));
    return {
      format: 'tap',
      prompt: 'Which day was the HIGHEST?',
      say: `Which day had the most ${thing}?`,
      visual: U.lineGraphSVG(pts, labels),
      choices: U.shuffle([{ label: labels[maxI], correct: true }]
        .concat(U.pickN(labels.filter((_, i) => i !== maxI), 3).map(l => ({ label: l, correct: false })))),
      explain: `The highest dot is on ${labels[maxI]} with ${pts[maxI]}.`
    };
  },

  /* ---------- GRADE 7 ---------- */

  'integer-ops': () => {
    const a = U.ri(-9, 9), b = U.ri(-9, 9);
    const add = Math.random() < 0.5;
    const ans = add ? a + b : a - b;
    const bs = b < 0 ? `(${b})` : String(b); // parenthesize negatives only
    const expr = add ? `${a} + ${bs}` : `${a} − ${bs}`;
    return {
      format: 'numpad',
      prompt: `${expr} = ?`,
      say: `What is ${a < 0 ? 'negative ' + (-a) : a} ${add ? 'plus' : 'minus'} ${b < 0 ? 'negative ' + (-b) : b}?`,
      allowNegative: true,
      answer: ans,
      explain: add
        ? `Start at ${a} on the number line and move ${Math.abs(b)} ${b >= 0 ? 'right' : 'left'}: ${ans}.`
        : `Subtracting ${b < 0 ? 'a negative moves you right' : 'moves you left'}: ${a} − (${b}) = ${ans}.`
    };
  },

  'decimal-ops': () => {
    const kind = U.pick(['add', 'sub', 'mult']);
    if (kind === 'mult') {
      const a = U.round(U.ri(2, 9) / 10, 1), b = U.ri(2, 9);
      return { format: 'numpad', prompt: `${a} × ${b} = ?`, say: `What is ${a} times ${b}?`, decimal: true, answer: U.round(a * b, 1), explain: `${a * 10} × ${b} = ${a * 10 * b}, then move the decimal one place: ${U.round(a * b, 1)}.` };
    }
    const a = U.round(U.ri(10, 99) / 10, 1), b = U.round(U.ri(10, 99) / 10, 1);
    if (kind === 'add') return { format: 'numpad', prompt: `${a} + ${b} = ?`, say: `What is ${a} plus ${b}?`, decimal: true, answer: U.round(a + b, 1), explain: `Line up the decimal points and add: ${U.round(a + b, 1)}.` };
    const hi = Math.max(a, b), lo = Math.min(a, b);
    return { format: 'numpad', prompt: `${hi} − ${lo} = ?`, say: `What is ${hi} minus ${lo}?`, decimal: true, answer: U.round(hi - lo, 1), explain: `Line up the decimal points and subtract: ${U.round(hi - lo, 1)}.` };
  },

  'fraction-ops': () => {
    const den = U.pick([4, 5, 6, 8, 10]);
    const a = U.ri(1, den - 2), b = U.ri(1, den - a - 1);
    const add = Math.random() < 0.5;
    const rawN = add ? a + b : Math.max(a, b) - Math.min(a, b);
    if (rawN === 0) return MG['fraction-ops']();
    const g = U.gcd(rawN, den);
    const ans = `${rawN / g}/${den / g}`;
    const hi = Math.max(a, b), lo = Math.min(a, b);
    const expr = add ? `${a}/${den} + ${b}/${den}` : `${hi}/${den} − ${lo}/${den}`;
    const wrongs = [...new Set([`${rawN}/${den * 2}`, `${add ? a + b : hi - lo}/${den + den}`, `${Math.min(rawN + 1, den)}/${den}`, `${rawN}/${den}` !== ans ? `${rawN}/${den}` : `${rawN + 2}/${den}`])].filter(w => w !== ans);
    return {
      format: 'tap',
      prompt: `${expr} = ?`,
      say: `What is ${expr.replace('/', ' over ').replace('+', 'plus').replace('−', 'minus').replace('/', ' over ')}? Give the simplest form.`,
      choices: U.choicesFrom(ans, wrongs.slice(0, 3)),
      explain: `Same denominators — just ${add ? 'add' : 'subtract'} the tops: ${rawN}/${den}${g > 1 ? `, which simplifies to ${ans}` : ''}. The denominator stays the same.`
    };
  },

  'two-step-equation': () => {
    const x = U.ri(2, 10), a = U.ri(2, 6), b = U.ri(1, 15);
    const plus = Math.random() < 0.5;
    const rhs = plus ? a * x + b : a * x - b;
    return {
      format: 'numpad',
      prompt: `${a}x ${plus ? '+' : '−'} ${b} = ${rhs}.  x = ?`,
      say: `${a} x ${plus ? 'plus' : 'minus'} ${b} equals ${rhs}. Solve for x.`,
      answer: x,
      explain: `First ${plus ? 'subtract' : 'add'} ${b}: ${a}x = ${a * x}. Then divide by ${a}: x = ${x}.`
    };
  },

  'circle-measure': () => {
    const r = U.ri(2, 10);
    const circum = Math.random() < 0.5;
    if (circum) {
      const d = r * 2;
      return {
        format: 'numpad',
        prompt: `Circle with diameter ${d}. Circumference ≈ ? (use π ≈ 3.14)`,
        say: `A circle has a diameter of ${d}. Using pi as about 3.14, what is the circumference, rounded to one decimal?`,
        decimal: true,
        answer: U.round(3.14 * d, 1),
        tolerance: 0.06,
        visual: `<svg viewBox="0 0 120 120" class="clock-svg"><circle cx="60" cy="60" r="48" fill="#e8f7f5" stroke="#4ecdc4" stroke-width="3"/><line x1="12" y1="60" x2="108" y2="60" stroke="#3d3554" stroke-width="2.5"/><text x="60" y="52" text-anchor="middle" font-size="15" font-weight="700" fill="#3d3554">d = ${d}</text></svg>`,
        explain: `Circumference = π × diameter = 3.14 × ${d} = ${U.round(3.14 * d, 1)}.`
      };
    }
    return {
      format: 'numpad',
      prompt: `Circle with radius ${r}. Area ≈ ? (use π ≈ 3.14)`,
      say: `A circle has a radius of ${r}. Using pi as about 3.14, what is the area, rounded to one decimal?`,
      decimal: true,
      answer: U.round(3.14 * r * r, 1),
      tolerance: 0.06,
      visual: `<svg viewBox="0 0 120 120" class="clock-svg"><circle cx="60" cy="60" r="48" fill="#fff0e8" stroke="#ff7a59" stroke-width="3"/><line x1="60" y1="60" x2="108" y2="60" stroke="#3d3554" stroke-width="2.5"/><text x="80" y="52" text-anchor="middle" font-size="15" font-weight="700" fill="#3d3554">r = ${r}</text></svg>`,
      explain: `Area = π × r × r = 3.14 × ${r} × ${r} = ${U.round(3.14 * r * r, 1)}.`
    };
  },

  'cartesian': () => {
    const x = U.ri(0, 6), y = U.ri(0, 6);
    const style = U.ri(0, 1);
    if (style === 0) {
      return {
        format: 'tap',
        prompt: 'What are the coordinates of the point?',
        say: 'Find the point on the grid. Read across first, then up. What are its coordinates?',
        visual: U.gridSVG(x, y, true),
        choices: U.choicesFrom(`(${x}, ${y})`, [...new Set([`(${y}, ${x})`, `(${x}, ${(y + 1) % 7})`, `(${(x + 1) % 7}, ${y})`, `(${(x + 2) % 7}, ${(y + 3) % 7})`])].filter(v => v !== `(${x}, ${y})`).slice(0, 3)),
        explain: `Across ${x}, then up ${y}: the point is at (${x}, ${y}). Always x first, then y.`
      };
    }
    return {
      format: 'tap',
      prompt: `Where would (${x}, ${y}) be?`,
      say: `Imagine plotting the point ${x}, ${y}. Across ${x}, up ${y}. Which grid shows it?`,
      choices: U.shuffle([
        { html: U.gridSVG(x, y, true), correct: true },
        { html: U.gridSVG(y === x ? (x + 2) % 7 : y, y === x ? (y + 1) % 7 : x, true), correct: false }
      ]),
      big: true,
      explain: `Across ${x} first, then up ${y}.`
    };
  },

  'central-tendency': () => {
    const kind = U.pick(['mean', 'median', 'mode']);
    if (kind === 'mean') {
      const n = U.ri(3, 4);
      const mean = U.ri(3, 10);
      let vals = Array.from({ length: n - 1 }, () => U.ri(1, mean * 2));
      const last = mean * n - vals.reduce((a, b) => a + b, 0);
      if (last < 0 || last > 30) return MG['central-tendency']();
      vals.push(last);
      vals = U.shuffle(vals);
      return {
        format: 'numpad',
        prompt: `Find the MEAN: ${vals.join(', ')}`,
        say: `Find the mean, the average, of these numbers: ${vals.join(', ')}. Add them up, then divide by how many there are.`,
        answer: mean,
        explain: `Sum = ${vals.reduce((a, b) => a + b, 0)}. Divide by ${n}: mean = ${mean}.`
      };
    }
    if (kind === 'median') {
      const vals = U.shuffle([U.ri(1, 5), U.ri(6, 10), U.ri(11, 15), U.ri(16, 20), U.ri(21, 25)]);
      const sorted = vals.slice().sort((a, b) => a - b);
      return {
        format: 'numpad',
        prompt: `Find the MEDIAN: ${vals.join(', ')}`,
        say: `Find the median of these numbers: ${vals.join(', ')}. Put them in order, then take the middle one.`,
        answer: sorted[2],
        explain: `In order: ${sorted.join(', ')}. The middle value is ${sorted[2]}.`
      };
    }
    const modeVal = U.ri(1, 12);
    let others = [];
    while (others.length < 3) { const v = U.ri(1, 12); if (v !== modeVal && !others.includes(v)) others.push(v); }
    const vals = U.shuffle([modeVal, modeVal, modeVal, ...others.slice(0, 2)]);
    return {
      format: 'numpad',
      prompt: `Find the MODE: ${vals.join(', ')}`,
      say: `Find the mode of these numbers: ${vals.join(', ')}. The mode appears most often.`,
      answer: modeVal,
      explain: `${modeVal} appears ${vals.filter(v => v === modeVal).length} times — more than any other. Mode = ${modeVal}.`
    };
  }
};

function tableHTML(names, vals, caption) {
  return `<table class="data-table"><caption>${caption}</caption>${names.map((n, i) =>
    `<tr><td>${n}</td><td><b>${vals[i]}</b></td></tr>`).join('')}</table>`;
}
