# eTop English App — Improvement Loop

Self-paced autonomous loop on the eTop English student progress web app
(React + Vite + TypeScript + Tailwind, root project `etop-english`).

Start: 2026-07-11 07:37 UTC. Stop at or after **2026-07-11 11:37 UTC**
(epoch 1783769839) or after 14 iterations, whichever comes first.

## Target
The app at repo root (`src/`, `index.html`, `package.json` name `etop-english`).
Not the Organika spreadsheet, not `pilgrimage/`.

## Effort split each iteration
- 80 percent improvement of what exists: UX polish, correctness, accessibility,
  mobile ergonomics, i18n completeness, performance, bug fixes, code quality.
- 20 percent expansion: one genuinely useful feature aligned with the product spec.

## Interface priority
It is an app, so prioritize the application and an easy interface. Every change
should make the app easier and more pleasant to use on a phone. Duolingo like:
friendly, colorful, satisfying micro feedback, large clear typography.

## Hard rules, never violated
1. `npm run build` must pass (tsc typecheck plus vite build) before every commit.
2. `npx tsx scripts/smoke.ts` must pass before every commit.
3. No secrets, no hardcoded credentials beyond the existing demo seed.
4. Keep the bilingual vi and en i18n layer complete. Any new user facing string
   goes through the i18n dictionary in both languages. No raw untranslated strings.
5. Preserve existing role based access control on every route.
6. If a change cannot pass build and smoke, revert it. Never push a broken app.
7. Prefer improving existing code over adding files. New features must fit the spec.
8. Commit and push every successful iteration with a clear message.
9. Verify behavior where feasible by driving the built app in a headless browser
   and capturing a screenshot, not only by trusting the type checker.

## Iteration protocol
1. Pick the single highest value improvement plus optional small expansion.
2. Implement. Run build and smoke. Fix or revert on failure.
3. Where it touches UI, verify in a headless browser and screenshot.
4. Update the log below.
5. Commit and push.
6. Schedule the next wake, or stop if past deadline or iteration cap.

## Backlog, reprioritized each iteration
- [ ] Accessibility pass, focus states, aria labels, color contrast, tap targets.
- [ ] Loading and empty states everywhere, friendly not blank.
- [ ] Micro feedback, streak and points animations, homework complete celebration.
- [ ] Parent view parity and clarity, Vietnamese default, progress chart legibility.
- [ ] Teacher gradebook speed, enter a score and comment in under a minute.
- [ ] Vocabulary flashcards, spaced repetition ordering, quiz variety.
- [ ] Leaderboard fairness and privacy, opt in, class scoped.
- [ ] PWA, manifest, service worker, add to home screen, offline shell.
- [ ] Error boundaries and safe fallbacks so a bad record never blanks the app.
- [ ] Dark mode that respects system preference.
- [ ] i18n audit, find any untranslated string, ensure vi and en parity.
- [ ] Performance, code split routes, shrink initial bundle.
- [ ] Data integrity, guard against corrupt localStorage, migration safety.

## Log
- Iteration 1. Global ErrorBoundary wrapping the provider tree, friendly bilingual
  recovery card with Reload and Restore demo data. A thrown render no longer blanks
  the app. Verified in a headless browser by forcing a render error.
- Iteration 2. Store resilience. loadDB now validates that every DB collection is an
  array and reseeds on corrupt or partial localStorage. All writes go through a
  guarded persist that tolerates full or blocked storage. Verified in browser with
  corrupt and partial databases, both recover to the login page.
