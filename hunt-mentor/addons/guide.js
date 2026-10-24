/* "How to use this app" guide (add on). Route #/guide. Point form tour of each feature with a button to open it.
   Linked from More and from a Home card for new users (window.HMGuide.homeCard, called by app.js home()).
   Facts here are about the app itself (what each button does), plus a few rule lines copied from the lessons with their
   certainty and source. User data: localStorage hm.guide.v1 ({ seen, hide }) on this phone only. */
(function () {
  'use strict';
  const KEY = 'hm.guide.v1';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ld = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
  const sv = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage blocked */ } };
  const badge = (v) => `<span class="cert ${v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip'}" title="Certainty">${v}%</span>`;
  const has = (id) => !!((window.HM && window.HM.sessions) || []).find((s) => s.id === id);
  // a lesson link at the screen whose title matches (screen 0 when no match)
  const lesson = (id, re) => {
    const s = ((window.HM && window.HM.sessions) || []).find((x) => x.id === id);
    if (!s) return '';
    const i = re ? (s.steps || []).findIndex((st, k) => k > 0 && re.test(st.title || '')) : 0; // screen 0 repeats the lesson title
    return `#/s/${id}/${Math.max(0, i)}`;
  };

  // [heading, [ [title, [lines], [[href, label], ...], picture how to id (app/addons/howto.js, optional)] ]]
  const SECTIONS = () => [
    ['Home and studying', [
      ['Home study card', [
        'Make a hunt plan and Home shows "Study for" that hunt at the top.',
        'Each day: a few lesson screens plus 10 review cards, about 10 minutes.',
        'Must know screens come first, so they are done before your hunt.',
        'Pace: open the plan, part 5, to change it. Late? It tells you.',
      ], [['#/', 'Open Home'], ['#/plan', 'My hunt plans']], 'home_study'],
      ['Daily cards', [
        'Short flashcards from every deck. Tap to flip, then say how well you knew it.',
        'Cards you miss come back sooner. Cards you know come back later.',
      ], [['#/daily', "Today's cards"]], 'daily'],
      ['Lessons', [
        'Learn has every lesson, with filters by topic.',
        'Tap an underlined word for its meaning. Tap a place name or MU (Management Unit) for a small map.',
      ], [['#/learn', 'All lessons']]],
    ]],
    ['Plan your hunt', [
      ['Hunt plans', [
        'Pick an animal, a place and dates.',
        'You get: is it open, your odds, a day by day plan, a checklist and a study path.',
        'Plans stay on this phone and go in your backup.',
      ], [['#/plan/new/0', 'Plan a hunt']], 'plan'],
      ['Harrison presets', [
        'Two ready made starts: black tailed deer near Harrison with a rifle, with your brother or solo.',
        'They fill in the animal, place and method. You only pick the dates.',
        'Read the Harrison lesson first: the rules that bite there.',
      ], [['#/plan/preset/harrison-deer-two', 'With my brother'], ['#/plan/preset/harrison-deer-solo', 'Solo'], [lesson('local-harrison-deer'), 'Your Harrison deer hunt']], 'presets'],
      ['Hunt week checklist', [
        'From 14 days before a saved plan starts, Home shows a Hunt week card.',
        'Licences, rifle, scouting, safety, meat plan and the morning of, in order. Ticks stay on this phone.',
      ], [['#/huntweek', 'Hunt week']], 'huntweek'],
      ['Hunt ready score', [
        'Scores one saved plan: its dates, place and study path.',
        'Weak spots come from your lesson quizzes, flashcards and the practice trainers.',
      ], [['#/progress', 'Hunt ready']], 'ready'],
    ]],
    ['Hunt Map', [
      ['Layer sets: Clean, Scouting, Hunt day', [
        'Tap Layers (bottom left of the map). The 3 buttons at the top switch many layers at once.',
        'Clean: base map only. Scouting: where you can likely hunt, spots, camps, winter range, cutblocks, burns.',
        'Hunt day: no shooting areas, Crown land and MU lines with numbers. Your waypoints always stay.',
      ], [['#/map', 'Open the map']], 'layer_sets'],
      ['What am I looking at?', [
        'In Layers, tap "What am I looking at?" for a key to every colour on screen.',
        'Each layer has an i button: what it shows, why it matters, how sure it is.',
      ], [['#/map', 'Open the map']], 'what_key'],
      ['Search the map', [
        'Tap the magnifying glass, top right of the map.',
        'Find towns and lakes, MU (Management Unit) numbers, rec sites, camps, spots, your waypoints and coordinates.',
        'Works with no signal for MUs, coordinates, saved camps, spots and your own items. Other place names need a connection.',
      ], [['#/map', 'Open the map']], 'search'],
      ['Tap the map: Here on the map', [
        'Tap or press and hold anywhere: a card shows the MU, land status and legal light now, and what is on the map there.',
        'Anything the app cannot read says CHECK, never a sure yes.',
        'From the card: Can I hunt here now?, Save point, Directions, Log sighting, Mark my truck here.',
      ], [['#/map', 'Open the map']], 'tap_card'],
      ['Can I hunt here now?', [
        'Pick the animal and weapon, then tap a point.',
        'It checks the MU, the season today, legal light and the land layers, and answers yes, no or check.',
        'Always read the "Still check yourself" lines. The map is a study aid, not the law.',
      ], [['#/map/tool/canhunt', 'Can I hunt here now?']], 'can_hunt'],
      ['Where can I hunt?', [
        'Turns on a first look at land where hunting is likely allowed. Bright green: likely open. Grey: check first.',
      ], [['#/map/tool/where', 'Where can I hunt?']], 'where_hunt'],
      ['Spots and camp cards', [
        'Tap a spot or a camp on the map for its card.',
        'Spots show tags like Good for 2, Good solo and Beginner friendly, and popular or quieter (an estimate).',
        'Every spot is a candidate. Scout it first. Pack out from here shows the carry back to the road.',
        'Camps: recreation sites, BC Parks and others. Closures show in red.',
      ], [['#/map', 'Open the map']], 'spots'],
      ['Mark my truck', [
        'Chip at the top left of the map. One tap saves where you parked.',
        'Then an arrow points back to the truck, with the distance and a walk back time (Tip).',
      ], [['#/map', 'Open the map']], 'truck'],
      ['Legal light and turnaround chips', [
        'Top left of the map: minutes of legal shooting light left where you stand.',
        'Orange under 30 minutes, red under 10. Tap it for the turnaround and the truck.',
      ], [['#/map', 'Open the map'], ['#/field/light', 'Legal light table']], 'light_chips'],
      ['Save this hunt area for no signal', [
        'On a saved plan: the "Offline for no signal" box saves the map around your plan point, spots and camp.',
        'Do it on wifi. The Harrison plan is about 56 MB. Then tap Check again: it should say ready.',
      ], [['#/plan', 'My hunt plans']], 'offline_area'],
      ['Steep ground', [
        'Layers, Terrain group, Steep ground. Off by default.',
        'Yellow 25 to 30 degrees, orange 30 to 35, red over 35. An estimate (about 70% sure).',
        'Plan the shot around the pack out (Tip).',
      ], [['#/map', 'Open the map']], 'steep'],
      ['Where can I practise?', [
        'Shooting ranges and gun clubs near you, to sight in the rifle. Call first: fees may apply (Tip).',
      ], [['#/map/tool/practice', 'Where can I practise?']]],
      ['Map help and tour', [
        'The ? button on the right of the map opens Help: every map button and what it does, what the colours mean, gestures and offline basics.',
        'Show me the tour again replays the 5 step first time tour.',
      ], [['#/map', 'Open the map']], 'help_tour'],
    ]],
    ['Safety', [
      ['Trip plan', [
        'Who, where, when back. Share it with someone at home with one tap. Nothing is sent without your tap.',
        `Overdue: your contact calls 911 and says you left a trip plan ${badge(70)} Chilliwack Search and Rescue.`,
      ], [['#/safety/trip', 'Trip plan']], 'trip_plan'],
      ['Turnaround time', [
        'Set the time to start walking back. The app counts down and alerts you while it is open.',
        'iPhone pauses web apps when the screen locks, so the alarm may not ring then.',
      ], [['#/safety/turn', 'Turnaround']], 'turnaround'],
      ['Emergency card', [
        '911 first. Your latitude and longitude on screen to read out. What to say, in order.',
      ], [['#/safety/sos', 'Emergency card']], 'emergency'],
      ['Bears and cougars', [
        'What to do when you see one, by animal and by what it is doing.',
        `Never run from a bear or a cougar ${badge(75)} WildSafeBC.`,
      ], [['#/safety/wildlife', 'Bears and cougars']], 'wildlife'],
      ['Conditions', [
        'Weather, wildfires and fire bans, and avalanche notes, checked live on a tap. Shows the last result offline.',
      ], [['#/safety/live', 'Conditions']], 'conditions'],
    ]],
    ['Practice and the field', [
      ['Trainers', [
        'Shot placement: tap where to shoot, or pass when it is not a good shot.',
        'Legal buck: count the points and decide. Guess the range: train your eye.',
        'Every answer is explained from the lessons.',
      ], [['#/train', 'Trainers']], 'trainers'],
      ["Shoot or don't shoot", [
        'Short field situations, Harrison deer first: look at the picture, make the call.',
        '10 rounds. Each answer shows the rule, how sure the app is, the source and the lesson to reopen.',
        'Missed ones come back next session.',
      ], [['#/train/decide', "Shoot or don't shoot"]], 'decide'],
      ['After the shot', [
        'Deer down or hit? One step at a time, 10 steps, from marking the spot to the meat and papers.',
        'Big buttons. Works with no signal.',
      ], [['#/aftershot', 'After the shot']], 'aftershot'],
      ['Field Mode', [
        'Big text for the bush. Legal to shoot? step by step, legal light, and cards for tagging and field dressing.',
        'Works with no signal.',
      ], [['#/field', 'Field Mode'], ['#/field/legal', 'Legal to shoot?']], 'field_mode'],
      ['Ask the app', [
        'Type a question. Answers come from the lessons, with no signal.',
      ], [['#/ask', 'Ask the app']]],
      ['Read aloud', [
        "Lessons and Today's cards: tap Read aloud above the screen.",
        "It uses the phone's own voice, so it works offline with the voices on the phone. Speed and voice are in the settings button.",
      ], [['#/learn', 'Lessons']], 'read_aloud'],
    ]],
    ['Your records', [
      ['Journal', [
        'Log every trip, even blank ones: date, place, weather, what you saw. Export as a spreadsheet file.',
      ], [['#/journal', 'Hunt journal']], 'journal'],
      ['Checklists', [
        'Before every hunt, licences and paperwork, after the kill, and a full list for each animal.',
      ], [['#/lists', 'Checklists']]],
      ['Backup and restore', [
        'Everything you do lives on this phone only. iPhone can clear it if the app goes unused for weeks.',
        'More, Backup: Export backup saves one file. Import puts it back, map items included.',
        'Export one before the hunt and keep it in your files or email.',
      ], [['#/more', 'Open More']], 'backup'],
      ['Add to Home Screen', [
        'iPhone: Safari, Share, Add to Home Screen, Add. Android: Chrome, three dots, Install app.',
        'Open it once from the home screen while you have signal. It then works offline.',
      ], [['#/install', 'How to install']], 'install'],
    ]],
  ];

  function css() {
    if (document.getElementById('hm-guide-css')) return;
    const st = document.createElement('style'); st.id = 'hm-guide-css';
    st.textContent = `
.hg h2 { font-size: 20px; margin: 0 0 6px; }
.hg-sec { font-size: 15px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 18px 4px 8px; }
.hg-f h3 { font-size: 18px; margin: 0 0 6px; }
.hg-f ul { margin: 0 0 4px; padding-left: 20px; font-size: 16px; }
.hg-f li { margin: 3px 0; }
.hg-f .btn-row { flex-wrap: wrap; margin-top: 8px; }
.hg-f .btn-row .btn { flex: 1 1 140px; min-height: 48px; font-size: 16px; }
.hg .cert, .hg-home .cert { font-size: 14px; }
.hg-toc { display: flex; flex-wrap: wrap; gap: 8px; }
.hg-toc a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 99px; color: var(--ink); text-decoration: none; font-size: 15px; background: var(--card); }
.hg-home .btn-row { flex-wrap: wrap; }
.hg-home .btn-row .btn { min-height: 48px; }
.hg-home p { font-size: 16px; margin: 4px 0; }`;
    document.head.appendChild(st);
  }

  function render() {
    css();
    const v = document.getElementById('view');
    const t = document.getElementById('top-title'); if (t) t.textContent = 'How to use this app';
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.dataset.tab === 'more'; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const o = ld(); if (!o.seen) { o.seen = Date.now(); sv(o); }
    const secs = SECTIONS();
    v.innerHTML = `<div class="hg">
      <div class="card"><h2>A quick tour</h2>
        <ul style="margin:0;padding-left:20px;font-size:16px"><li>Each part: what it does, in plain words, and a button to open it.</li>
        <li>Everything works on this phone. Most of it works with no signal.</li>
        <li>Picture steps under each part: swipe them, or use the arrows.</li>
        <li>Inside a screen, the How to button shows the same pictures.</li>
        <li>Study aid only. The official regulations are the law.</li></ul><div class="hg-how" data-hh="guide"></div>
        <div class="hg-toc" style="margin-top:10px">${secs.map(([h], i) => `<a href="#/guide" data-jump="hg-s${i}">${esc(h)}</a>`).join('')}</div></div>
      ${secs.map(([h, feats], i) => `<h2 class="hg-sec" id="hg-s${i}">${esc(h)}</h2>${feats.map(([ft, lines, links, how]) => `<div class="card hg-f"><h3>${esc(ft)}</h3>
        <ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${how ? `<div class="hg-how" data-hh="${esc(how)}"></div>` : ''}
        <div class="btn-row">${links.filter(([href]) => href).map(([href, lab], k) => `<a class="btn${k === 0 ? ' primary' : ''}" href="${esc(href)}">${esc(lab)}</a>`).join('')}</div></div>`).join('')}`).join('')}
      <div class="card"><p class="muted">New lessons and tools come with updates. This tour covers the app as of October 2026.</p><a class="btn block" href="#/more">Back to More</a></div>
    </div>`;
    // picture steps (app/addons/howto.js): filled in when its data loads; nothing shows without it
    const H = window.HMHowTo;
    if (H) H.load().then((d) => { if (!d || !v.querySelector('.hg')) return; v.querySelectorAll('.hg-how[data-hh]').forEach((el) => { el.innerHTML = H.strip(el.dataset.hh); }); H.wire(v); });
    v.querySelectorAll('[data-jump]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  }

  // Home card for new users: until the guide is opened or hidden, and while fewer than 3 lessons are done
  function homeCard(S) {
    const o = ld();
    if (o.seen || o.hide) return '';
    if (S && S.done && Object.keys(S.done).length >= 3) return '';
    css();
    return `<div class="card hg-home" id="hg-home"><h2>New here?</h2><p>A 2 minute tour of what the app can do, with a button for each part.</p>
      <div class="btn-row"><a class="btn primary" href="#/guide">How to use this app</a><button type="button" class="btn" id="hg-hide">Hide</button></div></div>`;
  }
  function wireHome(view) {
    const b = view && view.querySelector('#hg-hide');
    if (b) b.onclick = () => { const o = ld(); o.hide = true; sv(o); const c = view.querySelector('#hg-home'); if (c) c.remove(); };
  }

  window.HMGuide = { homeCard, wireHome, _sections: SECTIONS, _has: has };
  window.HMRoutes = window.HMRoutes || {};
  window.HMRoutes.guide = render;
})();
