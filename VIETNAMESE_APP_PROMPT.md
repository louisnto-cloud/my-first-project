# Build Prompt — "Đọc & Viết: Zero to Expert" (Learn to Read & Write VIETNAMESE)

> **How to use this file:** paste this entire document into a fresh Claude Code
> session and say "build this app". It is a complete specification, adapted
> from a finished English reading/writing app whose reference implementation
> lives in the repo `louisnto-cloud/my-first-project`, branch
> `claude/reading-writing-app-hbv4nu`, under `src/pages/student/rw/` — copy
> its patterns wherever this spec says "same as the base app".

---

## 1. What to build

A **standalone web app that teaches an English speaker to read and write
VIETNAMESE, from absolute zero to expert, over a 6-month programme.**

- Mobile-first, single-page React app. No login, no backend — all progress in
  `localStorage`.
- The app opens **directly into the programme** (no splash, no account).
- **Audio everywhere** via the browser SpeechSynthesis API with `lang: 'vi-VN'`
  (fall back gracefully with a visible notice if no Vietnamese voice is
  installed — same pattern as the base app's `AudioNotice`).
- UI text in **English** (the learner reads English); all learning content in
  **Vietnamese** with English glosses.

**Tech stack:** React 18 + TypeScript + Vite + Tailwind CSS. No router needed
(the base app uses internal state for navigation — copy that).

## 2. Branding (must NOT look like the base app)

- Name: **Đọc & Viết — Zero to Expert** (reads "Doc & Viet").
- Palette: choose a warm Vietnamese-inspired identity — lacquer red `#B3261E`
  as primary, deep jade `#155E4B` as secondary, lotus gold `#D9A441` as
  accent, on a soft warm-white ground. Define the palette by remapping
  Tailwind theme colors (the base app shows how in `tailwind.config.js`).
- Wordmark header: 🇻🇳-neutral book/lotus mark + app name + small
  "ZERO TO EXPERT" eyebrow.

## 3. App structure — four tabs (same skeleton as the base app)

1. **📚 Learn** — the 6-month curriculum (below). Continue-Learning button
   FIRST, then Today's Goals card, slim progress strip, month grid with
   sequential unlocking, placement test entry ("Not starting from zero?").
2. **📖 Library** — 12 graded Vietnamese stories (2 per level) with karaoke
   read-along (words highlight as spoken), tap-any-word-to-hear-it,
   per-story vocabulary, comprehension quiz in English.
3. **🔁 Review** — spaced-repetition deck built automatically from lesson key
   words + story vocab. Multiple-choice first; words answered correctly twice
   graduate to **typed recall** (type the Vietnamese word from the English
   meaning — diacritics required, but show a "close! check your tone marks"
   hint when the only error is diacritics). Plus a **flashcards** mode with
   Again/Got-it cycling.
4. **⭐ Me** — XP level card, streak calendar (14 days), badges grid,
   editable learner name, printable graduation certificate.

### Lesson flow (7 steps, same engine as base app)
Intro (audio + goal) → Content (tap-to-hear words, tables) → Key Words →
**Listening dictation** (hear a Vietnamese word, type it WITH diacritics) →
5 Exercises (multiple-choice / fill-blank) → Writing prompt (with automatic
feedback checks) → Complete (confetti + XP).

### Gamification (copy the base app's `engine.ts` wholesale)
- XP: +10 per correct exercise, +25 perfect bonus, +50 lesson, +10 dictation
  word, +30 story, +5 review answer, +20 review session — all **awarded once
  per item** via an `xpKeys` ledger so answers can't be re-farmed.
- 8 levels: Người mới 🐣 → Nhà khám phá chữ 🔤 → Thợ ghép vần 🧱 →
  Người viết câu ✏️ → Người đọc truyện 📖 → Cây bút 🖋️ → Bậc thầy từ ngữ 🏆 →
  Chuyên gia 🎓 (show English translation under each).
- 14 badges, daily streaks, Today's Goals (1 lesson + 1 review + 1 story
  bonus), per-day activity log.
- A/A+ text-size toggle; audio speed (slow/normal/fast) + voice picker.

## 4. The 6-month VIETNAMESE curriculum (~30 lessons)

Vietnamese is written in the Latin-based **chữ Quốc ngữ** — spelling is far
more regular than English, but **tones and diacritics are everything**. The
curriculum must drill them relentlessly with audio.

### Month 1 — Nền tảng / Foundations (Beginner) 🌱
- **The 29-letter alphabet**: a ă â b c d đ e ê g h i k l m n o ô ơ p q r s
  t u ư v x y. Interactive "Letter Lab" board (tap to hear). Emphasise the
  six letters English lacks: **ă â đ ê ô ơ ư** and that there is no f/j/w/z.
- **Vowels with diacritic hats**: a/ă/â, e/ê, o/ô/ơ, u/ư — minimal pairs with
  audio (ma vs mă vs mâ...).
- **D vs Đ** (d = /z/ north, /j/ south; đ = /d/) and other consonants.
- **Digraphs & trigraph**: ch, gh, gi, kh, ng, ngh, nh, ph, th, tr, qu.
- **THE SIX TONES** (2 lessons — this is the heart of Month 1):
  ngang (ma), huyền (mà), sắc (má), hỏi (mả), ngã (mã), nặng (mạ) — the
  classic "ma" sextet with audio for each; tone-mark placement rules.
- First words: xin chào, cảm ơn, tôi, bạn; reading single syllables.

### Month 2 — Ghép vần / Building Syllables (Elementary) 🧱
- Syllable anatomy: **âm đầu + vần + thanh** (initial + rhyme + tone).
- Common rhymes (vần): -an -ang -anh, -on -ong, -en -eng, -ai -ay -ây,
  -ao -au -âu, -oi -ôi -ơi...
- Spelling rules: c/k/q, g/gh, ng/ngh (before i, e, ê use gh/ngh/k).
- Core vocabulary themes: numbers, family (gia đình), food (đồ ăn), colours.
- First sentences: "Tôi là…", "Đây là…", subject-verb-object order,
  classifiers cái/con/chiếc (intro only).

### Month 3 — Câu và đoạn / Sentences & Paragraphs (Pre-Intermediate) 🌿
- Sentence patterns: questions (…không? …gì? …ở đâu?), negation (không),
  past/future markers (đã, đang, sẽ).
- Pronoun system & politeness: anh/chị/em/ông/bà (essential and unique to
  Vietnamese — dedicate a full lesson).
- Writing a short paragraph; connectors: và, nhưng, vì, nên.
- Reading strategy: finding the main idea (ý chính) in a short passage.

### Month 4 — Đọc hiểu / Fluency (Intermediate) 📖
- Compound words (từ ghép) and reduplication (từ láy: xinh xắn, nho nhỏ).
- Sino-Vietnamese vocabulary patterns (học sinh, giáo viên, điện thoại).
- Fact vs opinion; inference from context; formal letter basics.
- Regional notes: north/south pronunciation differences (listening only).

### Month 5 — Viết nâng cao / Advanced Literacy (Upper-Intermediate) ✍️
- Figurative language: so sánh (simile), ẩn dụ (metaphor), nhân hoá
  (personification) with Vietnamese examples and proverbs (tục ngữ).
- Formal vs informal register; email/letter conventions (Kính gửi…).
- Complex sentences: tuy…nhưng, nếu…thì, không những…mà còn.

### Month 6 — Chuyên gia / Expert (Advanced) 🎓
- Reading real texts: news style, story excerpts; SQ3R method.
- Essay structure (mở bài, thân bài, kết bài); editing & proofreading with a
  diacritic-accuracy checklist.
- **Capstone**: write a 300–400 word piece in Vietnamese (story, letter, or
  essay) + printable certificate.

Every lesson needs: `audioText` (spoken intro — English explanation with
Vietnamese examples), content body with tables, 3–5 key words
(`word` = Vietnamese, `meaning` = English), 5 exercises, a writing prompt.

## 5. Story library (12 graded Vietnamese stories)

Levels 1–2: 40–80 word stories using only taught letters/tones (e.g. "Con Mèo
Của Nam"). Levels 3–4: 120–250 words with dialogue. Levels 5–6: 300–400 word
folk tales (Sự tích) or everyday narratives. Each story: full Vietnamese text
(karaoke read-along), 3–4 vocabulary items, 4–5 comprehension questions asked
in English.

## 6. Vietnamese-specific implementation notes

- `SpeechSynthesisUtterance.lang = 'vi-VN'`; prefer a Vietnamese voice from
  `getVoices()`, and surface the AudioNotice if none exists.
- Dictation and typed recall MUST compare with diacritics. Provide a
  **tone-mark helper row** of tappable characters (ă â đ ê ô ơ ư and the five
  tone marks applied to the last vowel) above the input for learners without
  a Vietnamese keyboard.
- Word-boundary karaoke highlighting works the same as the base app
  (`useTTS.ts`) — Vietnamese words are space-separated syllables, which makes
  the word-offset mapping straightforward.
- Placement test: 12 questions, 2 per month (alphabet → tones → syllables →
  grammar → register → comprehension), early exit on first miss.

## 7. Acceptance criteria

1. Opening the app lands directly on the Learn tab; "Start Learning" reaches
   Lesson 1 in one tap; placement test is offered until the first lesson is
   completed.
2. A learner can hear every letter, tone, word, and story sentence spoken in
   Vietnamese, with karaoke highlighting during story read-along.
3. The six-tone lesson plays all six "ma" variants distinctly on tap.
4. Dictation rejects missing diacritics but shows a tone-hint message; the
   tone-mark helper row inserts characters correctly.
5. XP can never be earned twice for the same answer (ledger), streaks and
   Today's Goals update on any completed activity, badges toast on unlock.
6. Progress survives reload; reset requires confirmation.
7. `npm run build` passes with zero TypeScript errors.

## 8. Files worth copying from the base app (same repo, branch above)

| File | What it gives you |
|------|------------------|
| `src/pages/student/rw/engine.ts` | progress store, XP/levels/badges, streaks, award ledger, writing checks |
| `src/pages/student/rw/useTTS.ts` | speech synthesis + karaoke boundary highlighting + settings |
| `src/pages/student/rw/shared.tsx` | markdown renderer, tappable words, confetti, audio settings, text-size toggle |
| `src/pages/student/rw/LessonView.tsx` | 7-step lesson flow incl. dictation |
| `src/pages/student/rw/{Library,Review,Flashcards,Placement}.tsx` | the other three surfaces |
| `src/pages/student/ReadingWritingApp.tsx` | tab shell, month grid, Me tab, certificate |
| `src/data/{curriculum,library}.ts` | the data shapes to mirror with Vietnamese content |
