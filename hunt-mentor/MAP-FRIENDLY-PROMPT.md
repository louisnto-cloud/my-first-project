# Prompt: make the Hunt Map user friendly (round 3, 2026-10-23)

## Who it is for
- A first time hunter on an iPhone. Home base Mission, BC; deer hunting near Harrison (MUs 2-18, 2-19, 2-8).
- Not a map expert. Uses the map with gloves, in the cold, with low signal.

## Owner rule for this round
- **Remove nothing.** Every layer, tool and button stays. Make them easier to find, understand and use.

## Goal
A person who has never used the map can, within 1 minute: find Harrison, see if a spot is legal to hunt, and save it.

## Rules (all parts)
- hunt-mentor/CLAUDE.md applies: plain words, certainty % on rules, VERIFY when unsure, no em dashes, no hyphens in prose, acronyms spelled out.
- Phone first: 360 px, 14 px text or more, 44 px taps or more, one hand reachable.
- Offline first. Never a certain YES on anything legal. Never invented data.
- Test with Playwright at 360 px on a Range capable server. No console errors.

## Parts
1. **First time tour and help**
   - A 5 step tour the first time the map opens (skippable, replayable from Help): find a place, layer sets, tap a spot, Can I hunt here?, save for no signal.
   - A "?" Help sheet in plain words: what each button does, what the colours mean (links to What am I looking at?), gestures (pinch, two finger tilt, long press).
2. **Find anything**
   - One search box that finds: towns and lakes, MUs ("2-18"), rec sites and camps, candidate spots, your waypoints and tracks, and coordinates (decimal or degrees).
   - Recent searches, and one tap "Go to my hunt plan area".
3. **One tap, one clear card**
   - Tapping or long pressing anywhere gives the same calm card: **Here** (MU, land status, legal light now), **What is on the map here** (the layers under your finger, in plain words), **Do** (Can I hunt here?, Save point, Directions, Log sighting, Glassing near here, Mark my truck).
   - Big buttons, one blaze orange main action, swipe down or Back to close.

## Done means
- Each part tested at 360 px, online and offline, no console errors.
- Merged and published.
- A short report: what changed, tests, limits.
