# Prompt: improve the Hunt Map (round 2, 2026-10-18)

## Who it is for
- A beginner deer hunter. Home base Mission, BC. Hunting black tailed deer with a rifle around Harrison (MUs 2-18, 2-19, 2-8), with a brother or alone, likely a November weekend.
- Uses an iPhone, often with gloves, cold hands, low signal and bright sun.

## Goal
Make the map calmer, easier to read and more useful on the hunt day itself, without losing accuracy.

## Rules (all parts)
- Follow hunt-mentor/CLAUDE.md: point form, plain words, certainty % on rules, VERIFY when unsure, no em dashes, no hyphens in prose, acronyms spelled out, metric first.
- Phone first: 360 px wide, text 14 px or more, tap targets 44 px or more, works in bright sun.
- Offline first: every new feature works with no signal once the area is saved.
- Never a certain YES on anything legal. Never invent data.
- Test with Playwright at 360 px with a Range capable server (`http-server -p <port>`). No console errors.

## Parts
1. **Calmer map, clearer meaning**
   - One tap layer presets: "Clean" (base map only), "Scouting" (where you can likely hunt, spots, camps, winter range, cutblocks, burns), "Hunt day" (no shooting areas, Crown land, MU lines, your waypoints, legal light).
   - A "What am I looking at?" button: lists only the layers now on screen with their colour key, in plain words.
   - Fix every map label and button under 14 px or 44 px.
2. **Hunt day navigation**
   - "Mark my truck" in one tap, then a big arrow, distance and direction back to the truck, and a "time to walk back" estimate.
   - Legal light chip on the map: minutes left of legal shooting light for where you stand.
   - Turnaround reminder linked to the Safety tool's alarm.
3. **One tap offline for a plan**
   - From a saved hunt plan: "Save this hunt area for no signal", sized to the plan's spots and camp, with a size estimate and a clear "Ready offline" check.
4. **Steep ground and pack out**
   - Optional slope shading (steep ground warning) from the terrain the app already uses.
   - On spots: an honest pack out estimate (distance, climb, rough time) labelled Tip.

## Done means
- Each part tested at 360 px, online and offline, no console errors.
- Small commits ending "[skip ci]", merged, then published.
- A short report: what changed, what was tested, limits and VERIFY items.
