# Đọc & Viết — Zero to Expert

A self-contained Vietnamese reading & writing learning app. Takes a learner
from the 29 letters of the alphabet through to reading and writing, structured
as a "zero to expert" path with lessons, a library, spaced review, and a
progress/profile view.

## How it's built

- **Single file.** The entire app is `index.html` — a React app compiled and
  inlined (React 18 UMD, Tailwind's compiled utility classes, and all
  application code are embedded). There is no build step and no external
  network dependency.
- **Runs anywhere.** It works offline and even from `file://`. All state
  (progress, streak, XP) is kept in the browser via `localStorage`.
- **Audio is optional.** Pronunciation uses the browser's built-in
  `speechSynthesis` (`vi-VN`) when a Vietnamese voice is available; the app is
  fully usable without it.

## Deploying

Served as a static overlay at `/docviet` on GitHub Pages. The deploy workflow
(`.github/workflows/deploy.yml`) copies `docviet/index.html` as-is — no build.

## Source

Authored as a Claude artifact and vendored here as a standalone page. The
claude.ai preview wrapper (the `frame-runtime` preamble and its `<base href>`)
was stripped so the page runs on its own; the application code is unchanged.
