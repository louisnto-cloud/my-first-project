# Khu Vườn Nhỏ 🐢🌱

A Vietnamese language-learning web app (**Số** — numbers, and **Chữ cái** —
letters) built **autism-first** for a 6-year-old, minimally verbal, starting
from zero. Every decision serves four facts about the child: he is sensitive to
sound and busy visuals, needs strict routine and predictability, becomes very
distressed by mistakes, and does not yet read or speak.

This is not a kids' app with autism features bolted on. Autism-first design is
the foundation.

## The four non-negotiable laws

1. **No fail states, anywhere.** There is no wrong-answer screen, no red, no X,
   no error sound, no shake, no lost progress. An incorrect tap quietly fades
   and shrinks — nothing else. After two incorrect taps the correct answer
   begins a slow, gentle glow and waits. **Every question ends in success.**
   (Errorless learning, applied to 100% of the app.)
2. **Total predictability.** Every screen of the same type is laid out
   identically every time. Buttons never move; only their contents change.
   Structure is always: First→Then strip, token board, model card, three
   choices, praise line. No popups, no surprises, no timed or daily events.
3. **Zero speech or reading required.** Everything is *match-to-sample*: a model
   card on top, choices below, find the same one. Audio and on-screen text are
   optional supports, never requirements. The app is fully completable in total
   silence — this is verified by an automated test (see below).
4. **Sensory calm by default.** Sound is **OFF** by default (one parent toggle).
   When on: one soft Vietnamese voice + one quiet chime, nothing else. Muted
   low-saturation palette, generous white space, slow fades only, no flashing,
   no confetti. Respects `prefers-reduced-motion`. Max three choices on screen.

## How it works

- **Home** has exactly two cards (Số, Chữ cái) plus the sticker shelf. Each card
  opens a strictly linear chain of steps that unlock in order. The app always
  resumes at the child's exact next step — no map, no branching, no decisions.
- **The universal loop** (identical for every skill): First→Then strip →
  5 tokens fill left to right → model card + three choices (match to sample) →
  correct tap turns soft green, praise fades in (`Đúng rồi 🌱`), the turtle nods,
  a token fills → after 5 tokens, a calm 3-sticker choice → home.
- **Mastery**: a step completes after two clean sessions (finished with one or
  zero guided answers). Completed content stays replayable forever; nothing is
  ever locked away or rushed. Progress is invisible to the child beyond tokens
  and a growing sticker shelf.
- **Break (Nghỉ)** is always in the same top-left spot, on every screen. It
  opens a full-screen 8-second breathing circle (`Hít vào` / `Thở ra`) and
  never loses the child's place.
- **Parent area** (Vietnamese, behind a 3-second press-and-hold in the
  bottom-left corner): sound, motion, choices per question (2/3), praise text,
  session length (3/5/8 tokens); a one-screen progress view; and a short
  written explanation of *why the app never says "wrong."*

## Curriculum

Fully built from randomised templates — repetition never shows identical items,
but the structure and phrasing never change.

- **Số**: match pictures → match numerals 1–3 → 1–5 → count to 3 / 5 / 10 →
  more / fewer → match shapes → shape-to-outline → one more → combine to 5 →
  next number 1–5 / 1–10 → missing number.
- **Chữ cái**: match pictures → match letters (A O M T, widening through the
  Vietnamese alphabet incl. Ă Â Đ Ê Ô Ơ Ư) → find the letter → uppercase↔
  lowercase → letter-to-sound (picture-cued) → match syllables → syllable-to-
  picture → match words → word-to-picture (mèo, chó, cá, hoa, xe, gà).

## Tech

- Single-page app, **plain HTML/CSS/JS** — no framework, no build step, no
  server, no accounts, no external APIs, no ads, no links out.
- **Runs fully offline**, even opened directly from the file system
  (`file://`) — data is embedded, nothing is fetched at runtime.
- All progress, settings and stickers persist to `localStorage`.
- Fonts: Baloo 2 + Nunito (Google Fonts) for rounded shapes and Vietnamese
  diacritics, with a system-font fallback so diacritics render perfectly even
  offline.
- Responsive for iPad landscape and laptop. Touch targets ≥ 88px.

### Project layout

```
vuon/
  index.html            entry point (loads everything in order)
  css/styles.css        the calm garden theme
  js/
    data.js             curriculum + sticker data (structured, declarative)
    strings.js          every Vietnamese string (instructions are fixed)
    illustrations.js    flat muted single-subject SVGs
    util.js             DOM + randomisation + motion-aware transitions
    state.js            localStorage: settings, progress, stickers, usage
    audio.js            Vietnamese speech (vi-VN, rate 0.85) + soft chime
    components.js       First→Then, token board, turtle, break, parent gate
    engine.js           question generators + the errorless activity loop
    screens.js          home / sticker / break / parent + the router
    app.js              bootstrap
  scripts/smoke.mjs     Playwright test: plays every step with SOUND OFF
```

## Running

Just open `vuon/index.html` in a browser — no build, no server needed. When
deployed to GitHub Pages it lives at `…/my-first-project/vuon/`.

## Testing

`scripts/smoke.mjs` drives the whole app in a real browser with **sound off**,
completing every step of both paths purely by visual matching, and asserts that
every question ends in success and no runtime errors occur.

```
npm i playwright
node scripts/smoke.mjs
```
