# Prompt: keep improving Hunt Mentor for 6 hours (2026-10-23, 07:20 to 13:20 UTC)

## Who it is for
- A first time hunter, home base Mission, BC. Rifle, black tailed deer near Harrison (MUs 2-18, 2-19, 2-8), with a brother or solo, a November weekend.
- iPhone in Safari, added to the Home Screen. Gloves, cold, low signal.

## Goal
Make the app more correct, more reliable on an iPhone and more useful for this exact hunt. No new screens for their own sake.

## Rules
- hunt-mentor/CLAUDE.md applies in full (sources, certainty, VERIFY, Tips labelled, no em dashes, no hyphens in prose, acronyms spelled out, 14 px text, 44 px taps, offline first, remove nothing the owner did not ask to remove).
- Every agent: own git worktree branch from origin/claude/hunt-mentor-step0, small commits ending "[skip ci]", Playwright tests at 360 px on a Range capable server, build output deleted, `npm run lint:style` passes.
- Each part merges and goes live as soon as it passes. A final clean room check runs on the exact shipped version.

## Round 1 (now, about 3 hours)
1. **iPhone reliability audit and fixes.** Read every feature for iOS Safari and Home Screen app limits: service worker and cache size limits, IndexedDB, Range requests for map files, OffscreenCanvas fallback, DeviceOrientation permission, speechSynthesis, Web Share, vibration, wake lock, file downloads for backup, safe areas, 100vh, input zoom on focus (16 px inputs), position fixed with the keyboard. Fix what is broken, add graceful fallbacks, and an "Add to Home Screen" guide.
2. **Map: the tap card must never hide the hunt chips.** Keep the truck, legal light and turnaround chips visible above or beside any open sheet, or collapse the card to a peek height. No feature removed.
3. **Black tailed deer: the missing Masterclass.** Coastal black tailed deer differ from mule deer (rainforest cover, cutblocks, rut timing, smaller body, behaviour). Write a sourced Masterclass in the app's existing format (chapters like the other species), focused on the Fraser Valley and Harrison, plus a flashcard deck and quiz questions. Add it to the Harrison study path as must know where it fits.
4. **Accessibility pass.** VoiceOver labels on every button and icon, focus order in sheets, live regions for timers and countdowns, reduced motion, colour not the only signal. Fix what is found.

## Round 2 (about 3 hours, after round 1 merges)
5. **Clean room check of the whole shipped app** as a first time user doing the Harrison hunt end to end (plan, study, hunt week, save offline, hunt day map, after the shot). Fix small bugs; list larger ones.
6. **Whatever round 1 and 5 surface**, ranked by value for this hunt, within the remaining time.

## Done means
- Each part tested and published; a short report per part: what changed, tests, limits, VERIFY items.
- A final summary to the owner: done, not done, and why.
