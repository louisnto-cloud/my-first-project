# PLAN.md: Hunt Mentor

Status: Step 0 done. Waiting for owner answers and "go".
Today: 2026-09-30. First hunt: mid to late October 2026.

## 1. The big risk: time
- About 2 to 3 weeks until the first hunt.
- The app is not the bottleneck. Real world tasks are:
  - Buy shotgun, buy scope and mounts, sight in, pattern the shotgun.
  - Buy federal Migratory Game Bird Hunting Permit and stamp.
  - Buy any BC species licences needed (VERIFY which).
  - Buy clothing and waders.
- Plan: Phase A ships in 2 releases.
  - A1 (target 3 to 4 days after "go"): app shell, Field Mode, Sessions 1 to 6
    (countdown, licences, shotgun, scope, sighting in, ammo). These drive purchases.
  - A2 (target 7 to 9 days after "go"): Sessions 7 to 13 + legal flowchart + after the shot.
- Targets are estimates, not promises.

## 2. Phases
| Phase | Content | Stop for review |
|---|---|---|
| Step 0 | PLAN, CLAUDE, SOURCES, questions | Now |
| A1 | App shell, Field Mode, regs data file, Sessions 1 to 6 | Yes |
| A2 | Sessions 7 to 13, deploy, install steps | Yes |
| B | Foundations + Reading the Land | Yes |
| C | Species (core, then advanced, full list checked vs synopsis) | Yes |
| D | The Shot and After | Yes |
| E | Mastery, 3 local plans, 5 trip guides | Yes |

## 3. File layout
```
hunt-mentor/
  CLAUDE.md          rules for every session
  PLAN.md            this file
  SOURCES.md         every source, date checked
  package.json       build scripts only (no runtime libraries)
  build.mjs          Markdown -> JSON bundle, builds PWA + single file
  content/
    phase1/01-countdown.md ... 13-after-the-shot.md
    phase2/ ... phase6/
    species/*.md
    glossary.md
  data/
    regs.json        ALL seasons, limits, fees, with lastChecked per entry
    bases.json       3 bases: coordinates for offline sun times
    gear.json        prices by tier, with priceChecked date
  diagrams/*.svg     hand drawn SVGs
  app/
    index.html, app.js, style.css
    sw.js            service worker (offline cache)
    manifest.webmanifest, icons/
  scripts/
    lint-style.mjs   flags em dashes, hyphens in prose, long paragraphs, bare acronyms
    check-sources.mjs flags any rule without source + certainty + date
  dist/              build output (git ignored)
    hunt-mentor-offline.html   single file backup
```

## 4. Build choices made (small, logged here)
- Vanilla HTML, CSS, JavaScript. No framework. Fast on weak signal.
- Markdown is converted at build time. No Markdown library shipped to the phone.
- Build tool: Node plus one small Markdown parser (dev only).
- Storage: phone local storage for progress, quiz misses, checklists, journal.
- Legal light times: computed offline with standard sunrise and sunset math
  for each base. Labelled "verify with official tables".
  - Assumption: BC big game hours and migratory bird hours are defined relative
    to sunrise and sunset. VERIFY exact wording in synopsis and ECCC summary.
- Journal export: CSV (comma separated values) file download.
- Themes: light, dark, sunlight (max contrast).
- Lives in folder `hunt-mentor/` of this repo, separate from the other apps.
- Root CLAUDE.md is not changed. This folder has its own CLAUDE.md.

## 5. Research plan
- Parallel research agents by topic (licences, migratory birds, Region 2, 3, 8,
  firearms transport, ATV, gear prices).
- Separate reviewer agent checks every rule against its source before each report.
- Primary sources listed in SOURCES.md. Official only for rules.
- Gear prices: Canadian retailers, date checked. Prices are "price checked"
  snapshots, not facts about the future.

## 6. Risks
| Risk | Impact | Plan |
|---|---|---|
| Time to first hunt is short | Owner not ready | Ship A1 fast. Countdown session first. |
| Synopsis PDFs are large, tables hard to parse | Wrong season or limit | Read region PDFs directly. Reviewer agent. VERIFY if unclear. |
| MU (Management Unit) specific exceptions | Legal error in the field | Always show "check the MU table" + link. Never show a limit without MU scope. |
| In season changes after build | Stale data | "Before every hunt" checklist links to official change pages. |
| Gear prices change fast | Wrong budget | Date on every price. Tiers, not exact figures. |
| Local no shooting bylaws hard to map | Legal error | Link to official bylaw or map. VERIFY if not found. |
| Public hosting | Anyone with the link can see it | No personal data in the content. Journal stays on phone. |
| iPhone storage can clear offline data if unused for weeks | Lost progress | Add "export backup" button (JSON file). |

## 7. Owner answers (logged 2026-10-01)
- Phone: iPhone. Install via Safari "Add to Home Screen".
- Hosting: GitHub Pages, this repo, path `/my-first-project/hunt-mentor/`.
- Rifle: owner says "Tikka Arctic", barrel about 18 in, "the Canada version".
  - Likely Tikka T3x Arctic (Canadian Rangers model): 20 in barrel, iron sights,
    removable Picatinny rail (90%, manufacturer page via search). Owner to confirm.
- Budget: about $3,000 total for shotgun, scope, clothing and gear.
- Partner: brother. Has not hunted before. Licence status: ASK.
- Distance: open to ATV and walking 5 to 10 km. Wants best odds on deer.
  - Session 10 shows 3 scenarios: brother's land, ATV on FSRs, walk in.
- Pack out: brother helps.
- Water: brother's boat. Kayak possible. Canoe per brief.
- Quail: no Okanagan permission yet. Brother owns about 20 acres (about 8 ha)
  at Heffley Creek. Legality and safety of shooting there: VERIFY (bylaws,
  no shooting areas, distance to homes, backstop).
- Dog: none. Retrieval plan must work without a dog.
- Priority: deer, ducks, quail. Owner open to ducks and quail first. ASK final pick.

## 7b. Owner answers (logged 2026-10-01, later)
- Brother's own house is ON the 20 acres. 100 m buffer applies around it (75%, VERIFY rule text).
- Neighbours' houses about 100 to 200 m away. Usable shooting area on the property is small.
- Brother has CORE, PAL and FWID. Both will hunt. Plans are for 2 licensed hunters.
- Rifle confirmed iron sights only for now. Budget raised to about $10,000.
- Boat: 10 ft, both have PFDs. Kayak possible.
- Network: government sites blocked in this environment; owner asked to set Full access.

## 7c. Owner update (2026-10-01, later)
- Owner has ALL licences and permits now. Brother too (assumption: he bought his own; owner said "I have all the licenses").
- Owner: do not focus on the brother's land or Sun Peaks. Plan for the WHOLE region (Region 3) and all of BC. Base at Heffley Creek is just where they sleep.
- Official synopsis PDFs now downloaded (network opened 2026-10-01). Rules read directly can be 95%+.
- canada.ca still blocked. Federal duck seasons come from the Migratory Birds Regulations on laws-lois.justice.gc.ca instead.

## 7d. Owner update (2026-10-02)
- Owner wants real animal photos for ID and less text per screen (more screens are fine).
- Decision: photos from Wikimedia Commons and other public domain or Creative Commons sources, with credits. Overrides the "no copied images" line in the brief for photos only.
- Build now auto splits long screens (about 6 points or 120 words per screen) and lightens certainty badges.

## 8. Open questions
- See chat. Answers get logged here.
