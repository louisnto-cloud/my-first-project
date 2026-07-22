# LearnQuest 🗺️

A K–7 learning world for Math and English, modelled on the British Columbia
curriculum — built for a bright 9-year-old starting from zero. Playful on the
surface (Duolingo × Toca Boca × Monument Valley), rigorous underneath.

## Run it

No build step, no server, no accounts, no network needed after first load:

- **Laptop:** double-click `index.html` (or open it in any browser).
- **iPad:** serve the folder once (`python3 -m http.server` or any static host),
  open it in Safari, and Add to Home Screen. Everything runs locally after that.

All progress is saved to `localStorage` on the device.

## What's inside

- **Two continents** — Math World 🌋 and Word World 🌸 — each with 8 regions
  (Kindergarten → Grade 7), unlocked strictly in order.
- **123 level nodes + 16 Boss Challenges**, every one powered by randomized
  question templates (~70 generators) so replays never repeat.
- **Every level** runs the loop: *Show me* (worked example with narration) →
  *Try it* (guided, hints, unlimited attempts) → *Prove it* (6 unaided
  questions, 80% to pass). Failing just replays practice with new questions.
- **Review Mix** nodes every 5th level pull spaced-review questions from all
  earlier skills, including prior regions.
- **Boss Challenge** ends each region: 15 mixed questions, 85% to pass,
  trophy + coins on victory. Passing unlocks the next region.
- **Lightning Trial (Fast Track)** at each region entrance: 10-question
  sampler, 90%+ completes the whole region instantly — framed as a bonus
  challenge, never as skipping.
- **Audio-first**: SpeechSynthesis narrates everything in early regions
  (replay button on every question); narration tapers off through the grades.
- **Rewards**: stars (accuracy) → coins → avatar outfits, map decorations, and
  three pure-play mini games (Doodle Den, Melody Maker, Style Studio).
  Daily streak flame and a trophy shelf.
- **Parent view**: press-and-hold the corner icon for 3 seconds — one clean
  screen with per-subject progress and last-7-days activity.
- **No dark patterns**: no timers, no lives, no penalties. Wrong answers
  always get a gentle explanation.

## Code map

| File | Role |
| --- | --- |
| `js/data.js` | Curriculum structure: worlds → regions → skills/levels |
| `js/generators-math.js` | Math question template generators (K–7) |
| `js/generators-english.js` | English generators (K–7) |
| `js/content-english.js` | Word banks, phonics sets, passages, vocab |
| `js/activities.js` | Interaction engine: tap, numpad, sort, sequence, match, blank, trace, typed |
| `js/level.js` | Show me → Try it → Prove it flow; boss/fast-track/review runners |
| `js/map.js` | Home, continent, and region-path navigation |
| `js/rewards.js` | Avatar, shop, trophies, mini games |
| `js/celebrate.js` | Confetti, star pops, gentle wrong-answer teaching |
| `js/storage.js` | localStorage progress engine, streaks, unlock rules |
| `js/audio.js` | SpeechSynthesis narration + WebAudio sound effects |
| `js/parent.js` | Hold-to-open parent dashboard |
