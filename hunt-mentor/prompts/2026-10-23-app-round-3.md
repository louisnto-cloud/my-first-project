# Prompt: improve Hunt Mentor drastically (round 3, 2026-10-23)

## Who it is for
- A first time hunter. Home base Mission, BC. Rifle hunting black tailed deer near Harrison (MUs 2-18, 2-19, 2-8), with a brother or alone, a November weekend.
- Learns on an iPhone at home; uses it in the field with gloves, cold hands, low signal.

## The gap this round closes
The app teaches facts well. It does not yet train **decisions**, work **hands free**, guide the **minutes after the shot**, or show **what you still get wrong**. Those decide whether a first hunt ends safely, legally and with meat in the cooler.

## Rules (all parts)
- hunt-mentor/CLAUDE.md applies: plain words, certainty % and source on every rule, VERIFY when unsure, Tips labelled, no em dashes, no hyphens in prose, acronyms spelled out, metric first.
- Every fact comes from the app's own lessons and data (or an official source confirmed today and logged in SOURCES.md). Never invent.
- Phone first: 360 px, text 14 px or more, taps 44 px or more. Offline after first load.
- Built as add ons (app/addons/*.js, data in data/addons/<name>/), so they merge cleanly with the visual upgrade and speed work running in parallel.
- Tested with Playwright at 360 px on a Range capable server. No console errors.

## Parts
1. **Shoot or don't shoot: decision trainer** (#/train/decide)
   - About 60 short scenarios drawn from the lessons: legal light, MU and season, buck or antlerless, backstop, zones of fire with a partner, road allowance, private land signs, animal angle, running animal, wounded animal, another hunter nearby, bear encounter while dressing.
   - Each: a picture or diagram from the app, 2 to 4 choices, the right call with the rule, certainty and the lesson link.
   - Harrison deer scenarios first. Score history, and missed ones come back (spaced review).
2. **Hands free: read aloud**
   - A "Read aloud" button on every lesson screen and flashcard, using the phone's own voice (Web Speech API, works offline on iPhone).
   - Play, pause, next screen, speed. Skips diagrams' code, reads alt text.
3. **After the shot: guided steps** (#/aftershot)
   - One big button per step, in order: mark the spot, wait (timers from the lessons by hit sign), track, approach safely, confirm dead, cancel the tag (exact Rule Book steps), photos and notes, field dress (link diagrams), cool the meat, transport papers, report if required.
   - Works offline, saves a log to the journal, and links the truck arrow and turnaround.
4. **Know your weak spots** (#/progress)
   - From quiz, flashcard and trainer results: topics you miss most, with the 3 lessons to reread and a 5 minute drill.
   - A "Hunt ready" score with what is missing (study path, hunt week list, offline area saved, sighted in, trip plan), each item one tap away.

## Done means
- Each part tested, merged, published.
- A short report: what changed, tests, limits, VERIFY items.
